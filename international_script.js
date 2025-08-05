document.addEventListener('DOMContentLoaded', () => {
    const podiumSection = document.querySelector('.podium-section');
    const leaderboardSection = document.querySelector('.leaderboard-section');
    const loadingIndicator = document.getElementById('loading-indicator');
    const podiumSlots = document.querySelectorAll('.podium-slot');
    const modal = document.getElementById('details-modal');
    const modalDetails = document.getElementById('modal-details');
    const closeBtn = document.querySelector('.close-btn');

    // New elements for search functionality
    const searchFilterSection = document.querySelector('.search-filter-section');
    const toggleSearchBtn = document.getElementById('toggle-search-btn');
    const companyFilter = document.getElementById('company-filter');
    const staffSearchInput = document.getElementById('staff-search');
    const autocompleteList = document.getElementById('autocomplete-list');

    let allData = [];
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTlys14AiGHJNcXDBF-7tgiPZhIPN4Kl90Ml5ua9QMivwQz0_8ykgI-jo8fB3c9TZnUrMjF2Xfa3FO5/pub?gid=439106858&single=true&output=csv';

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

    function getNumericValue(value) {
        if (value === null || value === undefined) {
            return 0;
        }
        const strValue = String(value);
        const num = parseFloat(strValue.replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
    }
    
    function getPercentage(achievement, target) {
        if (getNumericValue(target) === 0) {
            return 0;
        }
        return (getNumericValue(achievement) / getNumericValue(target)) * 100;
    }

    function sortData(data) {
        return data.sort((a, b) => {
            const achievementA = getNumericValue(a['Contest Total NET']);
            const targetA = getNumericValue(a['Foreign trip contest Target']);
            const percentageA = getPercentage(achievementA, targetA);
    
            const achievementB = getNumericValue(b['Contest Total NET']);
            const targetB = getNumericValue(b['Foreign trip contest Target']);
            const percentageB = getPercentage(achievementB, targetB);
    
            return percentageB - percentageA;
        });
    }

    function getShortCompanyName(companyName) {
        switch (companyName) {
            case 'VANCHINAD FINANCE LTD':
                return 'VFL';
            case 'SML FINANCE LTD':
                return 'SML';
            case 'SANGEETH NIDHI LTD':
                return 'SNL';
            default:
                return companyName;
        }
    }

    function createPodium(topPerformers) {
        const ranks = [
            null, // for left slot
            null, // for middle slot
            null // for right slot
        ];
        
        // Correctly populate the ranks array based on podium order: Rank 2, Rank 1, Rank 3
        if (topPerformers[1]) ranks[0] = topPerformers[1]; // Rank 2 goes to the left podium slot
        if (topPerformers[0]) ranks[1] = topPerformers[0]; // Rank 1 goes to the middle podium slot
        if (topPerformers[2]) ranks[2] = topPerformers[2]; // Rank 3 goes to the right podium slot

        podiumSlots.forEach((slot, index) => {
            const user = ranks[index];
            if (user) {
                const rank = allData.findIndex(p => p === user) + 1;
                const achievement = getNumericValue(user['Contest Total NET']);
                const target = getNumericValue(user['Foreign trip contest Target']);
                const percentage = getPercentage(achievement, target);
                const shortCompanyName = getShortCompanyName(user['COMPANY NAME']);
                
                slot.innerHTML = `
                    <div class="podium-rank">Rank ${rank}</div>
                    <div class="podium-name">${user['STAFF NAME']} (${shortCompanyName})</div>
                    <div class="podium-achievement">Achievement: ${getFormattedValue(user['Contest Total NET'])} (${percentage.toFixed(2)}%)</div>
                `;

                // Add click listener to open modal
                slot.addEventListener('click', () => {
                    showDetailsModal(user, rank);
                });
            } else {
                slot.style.display = 'none';
            }
        });
        podiumSection.style.display = 'flex';
    }


    function createLeaderboard(remainingPerformers) {
        leaderboardSection.innerHTML = '';
        remainingPerformers.forEach((user) => {
            const rank = allData.findIndex(p => p === user) + 1;
            const achievement = getNumericValue(user['Contest Total NET']);
            const target = getNumericValue(user['Foreign trip contest Target']);
            const percentage = getPercentage(achievement, target);
            const shortCompanyName = getShortCompanyName(user['COMPANY NAME']);

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="tile-content">
                    <span class="rank">Rank ${rank}</span>
                    <span class="name">${user['STAFF NAME']} (${shortCompanyName})</span>
                    <span class="metric">Achievement: ${getFormattedValue(user['Contest Total NET'])} (${percentage.toFixed(2)}%)</span>
                </div>
            `;

            // Add click listener to open modal
            card.addEventListener('click', () => {
                showDetailsModal(user, rank);
            });
            leaderboardSection.appendChild(card);
        });
        leaderboardSection.style.display = 'grid';
    }


    function getFormattedValue(value) {
        if (value === null || value === undefined) {
            return 'Not Applicable';
        }
        const strValue = String(value);
        const num = parseFloat(strValue.replace(/,/g, ''));
        if (isNaN(num)) {
            return value;
        }
        return num.toLocaleString('en-IN');
    }

    function getAchievementValue(value) {
        if (value === null || value === undefined) {
            return '-';
        }
        const strValue = String(value);
        const num = parseFloat(strValue.replace(/,/g, ''));
        if (isNaN(num) || num === 0) {
            return '-';
        }
        return num.toLocaleString('en-IN');
    }

    function showDetailsModal(data, foreignRank) {
        const outstanding = data['OS AS ON 30.06.2025'] || 'N/A';
        const modalContent = [];
        const shortCompanyName = getShortCompanyName(data['COMPANY NAME']);

        modalContent.push(`
            <h2>${data['STAFF NAME']}</h2>
            <p><strong>Company:</strong> ${shortCompanyName}</p>
            <p><strong>Branch:</strong> ${data['BRANCH']}</p>
            <p><strong>Outstanding:</strong> ${outstanding}</p>
        `);
        
        // Foreign Trip Contest
        const foreignTripContestTarget = getNumericValue(data['Foreign trip contest Target']);
        const foreignTripFreshCustomerTarget = getNumericValue(data['Foreign trip fresh customer target']);
        const foreignTripContestAchievement = getNumericValue(data['Contest Total NET']);
        const foreignTripFreshCustomerAchievement = getNumericValue(data['FRESH CUSTOMER ACH JULY']);

        const foreignTripContestShortfall = foreignTripContestTarget - foreignTripContestAchievement;
        const foreignTripFreshCustomerShortfall = foreignTripFreshCustomerTarget - foreignTripFreshCustomerAchievement;

        modalContent.push(`
            <h3>Foreign Trip Contest</h3>
            <div class="modal-details-grid">
                <div class="detail-box">
                    <h4 data-tooltip="Total Business and fresh customer targets for the contest period.">Target</h4>
                    <p>Business: ${getFormattedValue(foreignTripContestTarget)}</p>
                    <p>Fresh Customers: ${getFormattedValue(foreignTripFreshCustomerTarget)}</p>
                </div>
                <div class="detail-box">
                    <h4 data-tooltip="The Business and fresh customer figures achieved.">Achievement</h4>
                    <p>Business: ${getAchievementValue(foreignTripContestAchievement)}</p>
                    <p>Fresh Customers: ${getFormattedValue(foreignTripFreshCustomerAchievement)}</p>
                </div>
                <div class="detail-box">
                    <h4 data-tooltip="The shortfall to reach the contest targets.">Shortfall</h4>
                    <p>Business: ${getFormattedValue(foreignTripContestShortfall)}</p>
                    <p>Fresh Customers: ${getFormattedValue(foreignTripFreshCustomerShortfall)}</p>
                </div>
            </div>
        `);
    
        // Domestic Trip Contest
        const domesticContestTarget = data['Domestic Trip contest target'];
        const domesticFreshCustomerTarget = data['Domestic Trip fresh customer target'];
        const isDomesticApplicable = (domesticContestTarget !== '' && domesticContestTarget !== undefined) || (domesticFreshCustomerTarget !== '' && domesticFreshCustomerTarget !== undefined);

        if (isDomesticApplicable) {
            const domesticTripContestTarget = getNumericValue(domesticContestTarget);
            const domesticTripFreshCustomerTarget = getNumericValue(domesticFreshCustomerTarget);
            const domesticTripContestAchievement = getNumericValue(data['Contest Total NET']);
            const domesticTripFreshCustomerAchievement = getNumericValue(data['FRESH CUSTOMER ACH JULY']);

            const domesticTripContestShortfall = domesticTripContestTarget - domesticTripContestAchievement;
            const domesticTripFreshCustomerShortfall = domesticTripFreshCustomerTarget - domesticTripFreshCustomerAchievement;

            modalContent.push(`
                <h3>Domestic Trip Contest</h3>
                <div class="modal-details-grid">
                    <div class="detail-box">
                        <h4 data-tooltip="The Business and Fresh customer targets for the domestic trip contest.">Target</h4>
                        <p>Business: ${getFormattedValue(domesticTripContestTarget)}</p>
                        <p>Fresh Customers: ${getFormattedValue(domesticTripFreshCustomerAchievement)}</p>
                    </div>
                    <div class="detail-box">
                        <h4 data-tooltip="The Business and Fresh customer figures achieved for the domestic trip contest.">Achievement</h4>
                        <p>Business: ${getAchievementValue(domesticTripContestAchievement)}</p>
                        <p>Fresh Customers: ${getFormattedValue(domesticTripFreshCustomerAchievement)}</p>
                    </div>
                    <div class="detail-box">
                        <h4 data-tooltip="The shortfall to reach the domestic trip targets.">Shortfall</h4>
                        <p>Business: ${getFormattedValue(domesticTripContestShortfall)}</p>
                        <p>Fresh Customers: ${getFormattedValue(domesticTripFreshCustomerShortfall)}</p>
                    </div>
                </div>
            `);
        } else {
            modalContent.push(`
                <h3>Domestic Trip</h3>
                <p>Not Applicable</p>
            `);
        }

        modalDetails.innerHTML = modalContent.join('');
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

    // New functions for search and filter logic
    function populateCompanyFilter(data) {
        const companyNames = [...new Set(data.map(item => item['COMPANY NAME']))];
        companyNames.sort();
        companyNames.forEach(company => {
            const option = document.createElement('option');
            option.value = company;
            option.textContent = getShortCompanyName(company);
            companyFilter.appendChild(option);
        });
    }

    function filterAndRender() {
        const selectedCompany = companyFilter.value;
        const searchTerm = staffSearchInput.value.toLowerCase();
        
        let filteredData = allData;
        
        if (selectedCompany) {
            filteredData = filteredData.filter(item => item['COMPANY NAME'] === selectedCompany);
        }

        if (searchTerm) {
            filteredData = filteredData.filter(item => item['STAFF NAME'].toLowerCase().includes(searchTerm));
        }

        const sortedData = sortData(filteredData);
        
        // Show/hide sections based on filtered results
        if (sortedData.length > 0) {
            const topPerformers = sortedData.slice(0, 3);
            const remainingPerformers = sortedData.slice(3);
            createPodium(topPerformers);
            createLeaderboard(remainingPerformers);
        } else {
            podiumSection.style.display = 'none';
            leaderboardSection.style.display = 'none';
        }
    }

    // Event listeners for search functionality
    toggleSearchBtn.addEventListener('click', () => {
        searchFilterSection.classList.toggle('collapsed');
        toggleSearchBtn.classList.toggle('active');
    });

    companyFilter.addEventListener('change', () => {
        staffSearchInput.value = '';
        autocompleteList.innerHTML = '';
        filterAndRender();
    });

    staffSearchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase();
        let filteredStaffNames = allData.filter(item => {
            const companyMatch = companyFilter.value ? item['COMPANY NAME'] === companyFilter.value : true;
            return companyMatch && item['STAFF NAME'].toLowerCase().includes(searchTerm);
        }).map(item => item['STAFF NAME']);

        filteredStaffNames = [...new Set(filteredStaffNames)].sort();

        autocompleteList.innerHTML = '';
        if (searchTerm && filteredStaffNames.length > 0) {
            filteredStaffNames.forEach(name => {
                const listItem = document.createElement('li');
                listItem.textContent = name;
                listItem.addEventListener('click', () => {
                    staffSearchInput.value = name;
                    autocompleteList.innerHTML = '';
                    filterAndRender();
                });
                autocompleteList.appendChild(listItem);
            });
        }
        filterAndRender();
    });

    // Hide autocomplete list when clicking outside
    document.addEventListener('click', (event) => {
        if (!staffSearchInput.contains(event.target) && !autocompleteList.contains(event.target)) {
            autocompleteList.innerHTML = '';
        }
    });

    fetchData(csvUrl).then(data => {
        allData = data.filter(item => getNumericValue(item['Domestic Trip contest target']) > 0 || getNumericValue(item['Foreign trip contest Target']) > 0);
        populateCompanyFilter(allData);
        filterAndRender();
        loadingIndicator.style.display = 'none';
    });
});
