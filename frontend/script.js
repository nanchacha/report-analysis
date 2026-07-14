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
    
    // Score bars
    const barAttention = document.getElementById('score-attention');
    const barMomentum = document.getElementById('score-momentum');
    const barTechnical = document.getElementById('score-technical');
    const barFundamental = document.getElementById('score-fundamental');

    // Set current date
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    dateElement.textContent = today.toLocaleDateString('ko-KR', options);

    // Fetch data
    fetch('data/reports_scored.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            loadingElement.style.display = 'none';
            renderHeatmap(data);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            loadingElement.style.display = 'none';
            errorElement.style.display = 'block';
        });

    function renderHeatmap(stocks) {
        gridElement.innerHTML = '';

        if (stocks.length === 0) {
            gridElement.innerHTML = '<div class="loading-state" style="grid-column: 1 / -1;"><p>오늘 분석된 종목 리포트가 없습니다.</p></div>';
            return;
        }

        stocks.forEach((stockData, index) => {
            // Clone template
            const clone = template.content.cloneNode(true);
            const cell = clone.querySelector('.heatmap-cell');
            
            // Set stock info
            cell.querySelector('.stock-name').textContent = stockData.stock;
            cell.querySelector('.mention-badge').textContent = stockData.scores.total + "점";
            
            // Determine heat level based on Total Score (max 100)
            let heatClass = 'heat-1';
            const total = stockData.scores.total;
            if (total >= 40 && total < 60) heatClass = 'heat-2';
            else if (total >= 60 && total < 80) heatClass = 'heat-3';
            else if (total >= 80) heatClass = 'heat-4';
            
            cell.classList.add(heatClass);
            
            // Animate entry with stagger
            cell.style.animationDelay = `${(index % 20) * 0.05}s`;
            
            // Add click event for modal
            cell.addEventListener('click', () => openModal(stockData));
            
            gridElement.appendChild(clone);
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
            li.innerHTML = `
                <div class="report-title">${escapeHTML(report.title)}</div>
                <div class="report-meta">
                    <span class="broker">${escapeHTML(report.broker)}</span>
                    <span class="date">${escapeHTML(report.date)}</span>
                </div>
            `;
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
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    function escapeHTML(str) {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }
});
