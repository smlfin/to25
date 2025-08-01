document.addEventListener('DOMContentLoaded', () => {
    const podiumSection = document.querySelector('.podium-section');
    const leaderboardSection = document.querySelector('.leaderboard-section');
    const loadingIndicator = document.getElementById('loading-indicator');
    const podiumSlots = document.querySelectorAll('.podium-slot');
    const modal = document.getElementById('details-modal');
    const modalDetails = document.getElementById('modal-details');
    const closeBtn = document.querySelector('.close-btn');

    let allData = [];

    const companyAbbreviations = {
        'SML FINANCE LTD': 'SML',
        'VANCHINAD FINANCE LTD': 'VFL',
        'SANGEETH NIDHI LTD': 'SNL'
    };

    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTlys14AiGHJNcXDBF-7tgiPZhIPN4Kl90Ml5ua9QMivwQz0_8ykgI-jo8fB3c9TZnUrMjF2Xfa3FO5/pub?gid=488762022&single=true&output=csv';

    async function fetchData(url) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            return parseCSV(text);
        } catch (error) {
            console.error('Error fetching CSV:', error);
            return [];
        }
    }

    function parseCSV(csvText) {
        const lines = csvText.trim().split(/\r?\n/);
        if (lines.length < 1) {
            return [];
        }
    
        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];
    
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const values = [];
            let inQuotes = false;
            let start = 0;
    
            for (let j = 0; j < line.length; j++) {
                if (line[j] === '"') {
                    inQuotes = !inQuotes;
                } else if (line[j] === ',' && !inQuotes) {
                    let value = line.substring(start, j).trim();
                    if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.substring(1, value.length - 1);
                    }
                    values.push(value);
                    start = j + 1;
                }
            }
            let lastValue = line.substring(start).trim();
            if (lastValue.startsWith('"') && lastValue.endsWith('"')) {
                lastValue = lastValue.substring(1, lastValue.length - 1);
            }
            values.push(lastValue);
    
            const rowObject = {};
            headers.forEach((header, index) => {
                rowObject[header] = values[index] !== undefined ? values[index] : '';
            });
            data.push(rowObject);
        }
    
        return data;
    }

    function sortData(data) {
        return data.sort((a, b) => {
            const valA = parseFloat(a['Net Growth Achievement'].replace(/,/g, '')) || 0;
            const valB = parseFloat(b['Net Growth Achievement'].replace(/,/g, '')) || 0;
            return valB - valA;
        });
    }

    function renderPodium(topPerformers) {
        const goldSlot = document.querySelector('.podium-slot.gold');
        const silverSlot = document.querySelector('.podium-slot.silver');
        const bronzeSlot = document.querySelector('.podium-slot.bronze');
    
        const updateSlot = (slot, performer, rank) => {
            const rankSpan = slot.querySelector('.rank');
            const nameSpan = slot.querySelector('.name');
            const metricSpan = slot.querySelector('.metric');
    
            if (performer) {
                const achievementValue = parseFloat(performer['Net Growth Achievement'].replace(/,/g, '')) || 0;
                rankSpan.textContent = `Rank ${rank}`;
                nameSpan.textContent = `${performer['Staff Name']} (${companyAbbreviations[performer['Company']] || performer['Company']})`;
                metricSpan.textContent = `Achievement: ${achievementValue.toLocaleString('en-IN')} (${performer['Ach Net Growth %']})`;
                slot.addEventListener('click', () => showDetailsModal(performer));
            } else {
                rankSpan.textContent = `Rank ${rank}`;
                nameSpan.textContent = '';
                metricSpan.textContent = '';
            }
        };
    
        updateSlot(goldSlot, topPerformers[0], 1);
        updateSlot(silverSlot, topPerformers[1], 2);
        updateSlot(bronzeSlot, topPerformers[2], 3);
    }

    function renderCards(performers) {
        leaderboardSection.innerHTML = '';
        performers.forEach(performer => {
            const card = document.createElement('div');
            card.classList.add('card');

            const rank = document.createElement('div');
            rank.classList.add('rank');
            rank.textContent = `Rank ${performer['SL No']}`;

            const name = document.createElement('div');
            name.classList.add('name');
            name.textContent = `${performer['Staff Name']} (${companyAbbreviations[performer['Company']] || performer['Company']})`;

            const achievementValue = parseFloat(performer['Net Growth Achievement'].replace(/,/g, '')) || 0;
            const metric = document.createElement('div');
            metric.classList.add('metric');
            metric.textContent = `Achievement: ${achievementValue.toLocaleString('en-IN')} (${performer['Ach Net Growth %']})`;

            card.appendChild(rank);
            card.appendChild(name);
            card.appendChild(metric);

            card.addEventListener('click', () => showDetailsModal(performer));

            leaderboardSection.appendChild(card);
        });
    }

    function displayGlobalData() {
        const sortedData = sortData(allData).slice(0, 25);

        sortedData.forEach((item, index) => {
            item['SL No'] = (index + 1).toString();
        });

        const top3 = sortedData.slice(0, 3);
        const remaining = sortedData.slice(3);

        renderPodium(top3);
        renderCards(remaining);

        loadingIndicator.style.display = 'none';
        podiumSection.style.display = 'flex';
        leaderboardSection.style.display = 'grid';
    }

    function showDetailsModal(data) {
        const growthTarget = parseFloat(data['International Trip Amount Target'].replace(/,/g, '')) || 0;
        const growthAchievement = parseFloat(data['Net Growth Achievement'].replace(/,/g, '')) || 0;
        const growthShortfall = (growthTarget - growthAchievement);

        const freshCustomerTarget = parseFloat(data['International Trip Fresh Customer Target']) || 0;
        const freshCustomerAchievement = parseFloat(data['Fresh Customer Achievement']) || 0;
        const freshCustomerShortfall = (freshCustomerTarget - freshCustomerAchievement);

        modalDetails.innerHTML = `
            <h2>${data['Staff Name']}</h2>
            <p><strong>Company:</strong> ${data['Company']}</p>
            <p><strong>Rank:</strong> ${data['SL No']}</p>
            <p><strong>Branch:</strong> ${data['Branch']}</p>
            
            <h3>International Trip Amount</h3>
            <div class="modal-details-grid">
                <div class="detail-box">
                    <h4>Target</h4>
                    <span class="value">${growthTarget.toLocaleString('en-IN')}</span>
                </div>
                <div class="detail-box">
                    <h4>Achievement</h4>
                    <span class="value">${growthAchievement.toLocaleString('en-IN')} (${data['Ach Net Growth %']})</span>
                </div>
                <div class="detail-box">
                    <h4>Shortfall</h4>
                    <span class="value">${growthShortfall.toLocaleString('en-IN')}</span>
                </div>
            </div>

            <h3>International Fresh Customer</h3>
            <div class="modal-details-grid">
                <div class="detail-box">
                    <h4>Target</h4>
                    <span class="value">${freshCustomerTarget.toLocaleString('en-IN')}</span>
                </div>
                <div class="detail-box">
                    <h4>Achievement</h4>
                    <span class="value">${freshCustomerAchievement.toLocaleString('en-IN')} (${data['Fresh Customer Achievement %']})</span>
                </div>
                <div class="detail-box">
                    <h4>Shortfall</h4>
                    <span class="value">${freshCustomerShortfall.toLocaleString('en-IN')}</span>
                </div>
            </div>
            <p><strong>Outstanding:</strong> ${data['Outstanding']}</p>
        `;
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    closeBtn.addEventListener('click', closeModal);

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    fetchData(csvUrl).then(data => {
        allData = data;
        displayGlobalData();
    });
});
