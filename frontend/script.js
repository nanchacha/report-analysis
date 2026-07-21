document.addEventListener('DOMContentLoaded', () => {
    const gridElement = document.getElementById('heatmap-grid');
    const template = document.getElementById('heatmap-cell-template');
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const dateElement = document.getElementById('current-date');
    
    // Modal elements
    const modal = document.getElementById('report-modal');
    const modalClose = document.getElementById('modal-close');
    const modalStockName = document.getElementById('modal-stock-name');
    const modalTotal = document.getElementById('modal-total');
    const modalReportList = document.getElementById('modal-report-list');
    
    // Conclusion Layer Popup elements
    const conclusionPopup = document.getElementById('conclusion-popup');
    const conclusionClose = document.getElementById('conclusion-close');
    const conclusionText = document.getElementById('conclusion-text');
    
    // Data storage
    let conclusions = {};
    let globalReportsData = [];
    let globalIndustriesData = [];
    let displayLimit = 30;
    const PAGE_SIZE = 30;
    
    // Score bars
    const barAttention = document.getElementById('score-attention');
    const barMomentum = document.getElementById('score-momentum');
    const barTechnical = document.getElementById('score-technical');
    const barFundamental = document.getElementById('score-fundamental');

    // Date will be set after fetching data

    // Fetch data
    Promise.all([
        fetch('data/reports_scored.json').then(res => res.json()),
        fetch('data/conclusions.json').then(res => res.json()).catch(() => ({})),
        fetch('data/industries.json').then(res => res.json()).catch(() => ({}))
    ])
    .then(([reportsData, conclusionsData, industriesData]) => {
        conclusions = conclusionsData;
        globalReportsData = reportsData;
        
        // 업종명 "와", "과" 기준으로 자르기 (예: "반도체와반도체장비" -> "반도체")
        globalIndustriesData = {};
        for (const [stock, ind] of Object.entries(industriesData)) {
            if (ind && ind !== "기타") {
                globalIndustriesData[stock] = ind.split(/[와과]/)[0];
            } else {
                globalIndustriesData[stock] = ind;
            }
        }
        
        loadingElement.style.display = 'none';
        
        // 데이터에서 누적 날짜 범위 계산
        if (reportsData.length > 0) {
            let minDate = "99.99.99";
            let maxDate = "00.00.00";
            reportsData.forEach(stock => {
                stock.reports.forEach(r => {
                    if (r.date < minDate) minDate = r.date;
                    if (r.date > maxDate) maxDate = r.date;
                });
            });
            if (minDate === "99.99.99") minDate = maxDate = "26.07.21";
            
            const parseDateStr = (dStr) => {
                const parts = dStr.split('.');
                return parts.length === 3 ? {
                    year: 2000 + parseInt(parts[0], 10),
                    month: parseInt(parts[1], 10),
                    day: parseInt(parts[2], 10)
                } : null;
            };
            
            const maxD = parseDateStr(maxDate);
            const minD = parseDateStr(minDate);
            
            if (maxD && minD) {
                const firstDay = new Date(maxD.year, maxD.month - 1, 1).getDay();
                const week = Math.ceil((maxD.day + firstDay) / 7);
                const formatD = (d) => `${d.month}/${d.day}`;
                const rangeStr = minDate === maxDate ? formatD(maxD) : `${formatD(minD)} ~ ${formatD(maxD)}`;
                dateElement.textContent = `${maxD.month}월 ${week}주차 (${rangeStr} 누적)`;
            } else {
                dateElement.textContent = "최신 누적 리포트";
            }
        } else {
            dateElement.textContent = "최신 리포트 없음";
        }
        
        renderHeatmap(globalReportsData, globalIndustriesData);
        renderIndustries(globalReportsData, globalIndustriesData);
        
        // Bind load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                displayLimit += PAGE_SIZE;
                renderHeatmap(globalReportsData, globalIndustriesData, true);
            });
        }
    })
    .catch(error => {
        console.error('Error fetching data:', error);
        loadingElement.style.display = 'none';
        errorElement.style.display = 'block';
    });

    function renderHeatmap(reportsData, industriesData, append = false) {
        if (!append) {
            gridElement.innerHTML = '';
        }

        if (reportsData.length === 0) {
            gridElement.innerHTML = '<div class="loading-state" style="grid-column: 1 / -1;"><p>오늘 분석된 종목 리포트가 없습니다.</p></div>';
            return;
        }
        
        const loadMoreContainer = document.getElementById('load-more-container');
        if (loadMoreContainer) {
            if (displayLimit < reportsData.length) {
                loadMoreContainer.style.display = 'block';
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }
        
        const visibleStocks = append ? reportsData.slice(displayLimit - PAGE_SIZE, displayLimit) : reportsData.slice(0, displayLimit);
        
        visibleStocks.forEach((stockData, index) => {
            // Clone template
            const clone = template.content.cloneNode(true);
            const cell = clone.querySelector('.heatmap-cell');
            
            // Set stock info
            cell.setAttribute('data-stock', stockData.stock);

            // Add hover events for industry tag highlighting
            cell.addEventListener('mouseenter', () => {
                if (!industriesData) return;
                const industry = industriesData[stockData.stock];
                if (industry) {
                    const targetTag = Array.from(document.querySelectorAll('.industry-tag'))
                                           .find(tag => tag.getAttribute('data-industry') === industry);
                    if (targetTag) targetTag.classList.add('hover-highlight');
                }
            });
            cell.addEventListener('mouseleave', () => {
                if (!industriesData) return;
                const industry = industriesData[stockData.stock];
                if (industry) {
                    const targetTag = Array.from(document.querySelectorAll('.industry-tag'))
                                           .find(tag => tag.getAttribute('data-industry') === industry);
                    if (targetTag) targetTag.classList.remove('hover-highlight');
                }
            });
            
            const stockNameEl = cell.querySelector('.stock-name');
            stockNameEl.textContent = stockData.stock;
            
            // 종목명이 긴 경우 폰트 크기 동적 조정 (셀 바깥 오버플로우 방지)
            if (stockData.stock.length > 7) {
                stockNameEl.style.fontSize = '0.85rem';
            } else if (stockData.stock.length > 5) {
                stockNameEl.style.fontSize = '0.95rem';
            }
            
            cell.querySelector('.mention-badge').textContent = stockData.scores.total + "점";
            
            // Determine heat level based on Total Score (max 100) mapped to 10 levels
            const total = stockData.scores.total;
            // E.g. total=0 => heat-1, total=95 => heat-10, total=100 => heat-10
            let level = Math.floor(total / 10) + 1;
            level = Math.max(1, Math.min(10, level));
            let heatClass = `heat-${level}`;
            
            cell.classList.add(heatClass);
            
            // Animate entry with stagger
            cell.style.animationDelay = `${(index % 20) * 0.05}s`;
            
            // Add click event for modal
            cell.addEventListener('click', () => openModal(stockData));
            
            gridElement.appendChild(clone);
        });
    }

    function renderIndustries(reportsData, industriesData) {
        const leftList = document.getElementById('industry-list-left');
        const rightList = document.getElementById('industry-list-right');
        if (!leftList || !rightList) return;
        
        const industryCounts = {};
        let maxCount = 1;
        reportsData.forEach(stockData => {
            const industry = industriesData[stockData.stock];
            if (industry && industry !== "기타") {
                industryCounts[industry] = (industryCounts[industry] || 0) + 1;
                if (industryCounts[industry] > maxCount) {
                    maxCount = industryCounts[industry];
                }
            }
        });
        
        // Convert to sorted array: by count (descending), then alphabetically
        const sortedIndustries = Object.keys(industryCounts).sort((a, b) => {
            const diff = industryCounts[b] - industryCounts[a];
            if (diff !== 0) return diff;
            return a.localeCompare(b);
        });
        
        leftList.innerHTML = '';
        rightList.innerHTML = '';
        
        const half = Math.ceil(sortedIndustries.length / 2);
        
        sortedIndustries.forEach((ind, index) => {
            const count = industryCounts[ind];
            const tag = document.createElement('span');
            tag.className = 'industry-tag';
            tag.setAttribute('data-industry', ind);
            tag.textContent = `${ind} (${count})`;
            
            // Calculate scale factor (0.0 to 1.0)
            const scaleFactor = maxCount > 1 ? (count - 1) / (maxCount - 1) : 0;
            const minSize = 0.8;
            let maxSize = 1.35; // Maximum font size in rem
            
            // 글자 수에 비례하여 최대 폰트 크기 감소 (사이드바 그리드 오버플로우 방지)
            if (ind.length > 5) {
                maxSize = Math.max(0.85, maxSize * (5 / ind.length));
            }
            
            const fontSize = minSize + (maxSize - minSize) * scaleFactor;
            tag.style.fontSize = `${fontSize}rem`;
            
            tag.addEventListener('click', () => {
                const isActive = tag.classList.contains('active');
                
                // Reset all tags
                document.querySelectorAll('.industry-tag').forEach(t => t.classList.remove('active'));
                
                const cells = document.querySelectorAll('.heatmap-cell');
                
                if (isActive) {
                    // Turn off filter
                    cells.forEach(cell => {
                        cell.classList.remove('dimmed');
                        cell.classList.remove('highlighted');
                    });
                } else {
                    // Apply filter
                    tag.classList.add('active');
                    cells.forEach(cell => {
                        const stockName = cell.getAttribute('data-stock');
                        const stockIndustry = industriesData[stockName];
                        if (stockIndustry === ind) {
                            cell.classList.remove('dimmed');
                            cell.classList.add('highlighted');
                        } else {
                            cell.classList.remove('highlighted');
                            cell.classList.add('dimmed');
                        }
                    });
                }
            });
            
            if (index < half) {
                leftList.appendChild(tag);
            } else {
                rightList.appendChild(tag);
            }
        });
    }

    function openModal(stockData) {
        modalStockName.textContent = stockData.stock;
        modalTotal.textContent = stockData.scores.total;
        
        // Reset bars to 0 first for animation
        barAttention.style.width = '0%';
        barMomentum.style.width = '0%';
        barTechnical.style.width = '0%';
        barFundamental.style.width = '0%';
        
        // Animate bars to score value (out of 25, so we multiply by 4 for percentage)
        setTimeout(() => {
            barAttention.style.width = (stockData.scores.attention * 4) + '%';
            barMomentum.style.width = (stockData.scores.momentum * 4) + '%';
            barTechnical.style.width = (stockData.scores.technical * 4) + '%';
            barFundamental.style.width = (stockData.scores.fundamental * 4) + '%';
        }, 50);
        
        modalReportList.innerHTML = '';
        stockData.reports.forEach(report => {
            const li = document.createElement('li');
            li.className = 'report-item';
            
            const titleDiv = document.createElement('div');
            titleDiv.className = 'report-title';
            titleDiv.textContent = report.title;
            
            // If conclusion exists, we can click title to show it
            if (conclusions[stockData.stock]) {
                titleDiv.title = "클릭하여 종합 의견 보기";
                titleDiv.addEventListener('click', () => {
                    conclusionText.textContent = conclusions[stockData.stock];
                    conclusionPopup.classList.add('active');
                });
            } else {
                titleDiv.style.cursor = 'default';
                titleDiv.style.textDecoration = 'none';
                titleDiv.title = "종합 의견이 없습니다";
            }
            
            const metaDiv = document.createElement('div');
            metaDiv.className = 'report-meta';
            
            let pdfLinkHtml = '';
            if (report.pdf_url) {
                // Not escaping the url here as it should be a valid URL, but wrapping in quotes
                pdfLinkHtml = `<a href="${report.pdf_url}" target="_blank" class="pdf-link" title="PDF 리포트 다운로드" onclick="event.stopPropagation()">[PDF]</a>`;
            }
            
            metaDiv.innerHTML = `
                <div class="broker-group">
                    <span class="broker">${escapeHTML(report.broker)}</span>
                    ${pdfLinkHtml}
                </div>
                <span class="date">${escapeHTML(report.date)}</span>
            `;
            
            li.appendChild(titleDiv);
            li.appendChild(metaDiv);
            modalReportList.appendChild(li);
        });
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    
    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Modal close events
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Conclusion Popup close events
    conclusionClose.addEventListener('click', () => {
        conclusionPopup.classList.remove('active');
    });
    conclusionPopup.addEventListener('click', (e) => {
        if (e.target === conclusionPopup) {
            conclusionPopup.classList.remove('active');
        }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (conclusionPopup.classList.contains('active')) {
                conclusionPopup.classList.remove('active');
            } else if (modal.classList.contains('active')) {
                closeModal();
            }
        }
    });

    function escapeHTML(str) {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }
});
