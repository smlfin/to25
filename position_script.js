document.addEventListener('DOMContentLoaded', () => {
    const loadingIndicator = document.getElementById('loading-indicator');
    const positionFinderSection = document.querySelector('.position-finder-section');
    const companySelect = document.getElementById('company-select');
    const staffNameInput = document.getElementById('staff-name-input');
    const staffSuggestions = document.getElementById('staff-suggestions');
    const showDetailsBtn = document.getElementById('show-details-btn');
    const modal = document.getElementById('details-modal');
    const modalDetails = document.getElementById('modal-details');
    const closeBtn = document.querySelector('.close-btn');
    const positionBody = document.body;

    let allData = [];
    let currentStaffList = [];

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

    function sortData(data) {
        return data.sort((a, b) => {
            const valA = parseFloat(a['Contest Total NET'].replace(/,/g, '')) || 0;
            const valB = parseFloat(b['Contest Total NET'].replace(/,/g, '')) || 0;
            return valB - valA;
        });
    }

    function populateCompanyDropdown() {
        const companies = [...new Set(allData.map(item => item['COMPANY NAME']))];
        companySelect.innerHTML = '<option value="">-- Select a company --</option>';
        companies.forEach(company => {
            if (company) {
                const option = document.createElement('option');
                option.value = company;
                option.textContent = company;
                companySelect.appendChild(option);
            }
        });
        companySelect.disabled = false;
    }

    function populateStaffList(selectedCompany) {
        currentStaffList = allData.filter(item => item['COMPANY NAME'] === selectedCompany).map(item => item['STAFF NAME']);
        staffNameInput.disabled = false;
        staffNameInput.value = '';
        staffSuggestions.innerHTML = '';
        showDetailsBtn.disabled = true;
    }

    function filterStaffList(query) {
        staffSuggestions.innerHTML = '';
        if (query.length > 0) {
            const filteredStaff = currentStaffList.filter(name => name.toLowerCase().includes(query.toLowerCase()));
            filteredStaff.forEach(name => {
                const li = document.createElement('li');
                li.textContent = name;
                li.addEventListener('click', () => {
                    staffNameInput.value = name;
                    staffSuggestions.innerHTML = '';
                    showDetailsBtn.disabled = false;
                });
                staffSuggestions.appendChild(li);
            });
        }
    }

    function findStaffMember(company, staffName) {
        return allData.find(item => item['COMPANY NAME'] === company && item['STAFF NAME'] === staffName);
    }

    function getFormattedValue(value) {
        if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
            return 'Not Applicable';
        }
        const strValue = String(value); // Ensure value is a string
        const num = parseFloat(strValue.replace(/,/g, ''));
        if (isNaN(num)) {
            return value;
        }
        return num.toLocaleString('en-IN');
    }

    function getNumericValue(value) {
        if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
            return 0;
        }
        const strValue = String(value); // Ensure value is a string
        const num = parseFloat(strValue.replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
    }

    function getAchievementValue(value) {
        if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
            return '-';
        }
        const strValue = String(value); // Ensure value is a string
        const num = parseFloat(strValue.replace(/,/g, ''));
        if (isNaN(num) || num === 0) {
            return '-';
        }
        return num.toLocaleString('en-IN');
    }

    function showDetailsModal(data) {
        const outstanding = data['OS AS ON 30.06.2025'] || 'N/A';
        const modalContent = [];

        modalContent.push(`
            <h2>${data['STAFF NAME']}</h2>
            <p><strong>Company:</strong> ${data['COMPANY NAME']}</p>
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
                    <h4 data-tooltip="Total business and fresh customer targets for the contest period.">Target</h4>
                    <p>Business: ${getFormattedValue(foreignTripContestTarget)}</p>
                    <p>Fresh Customers: ${getFormattedValue(foreignTripFreshCustomerTarget)}</p>
                </div>
                <div class="detail-box">
                    <h4 data-tooltip="The business and fresh customer figures achieved.">Achievement</h4>
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
                        <h4 data-tooltip="The business and fresh customer targets for the domestic trip contest.">Target</h4>
                        <p>Business: ${getFormattedValue(domesticTripContestTarget)}</p>
                        <p>Fresh Customers: ${getFormattedValue(domesticTripFreshCustomerTarget)}</p>
                    </div>
                    <div class="detail-box">
                        <h4 data-tooltip="The business and fresh customer figures achieved for the domestic trip contest.">Achievement</h4>
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

    companySelect.addEventListener('change', (event) => {
        const selectedCompany = event.target.value;
        if (selectedCompany) {
            populateStaffList(selectedCompany);
        } else {
            staffNameInput.disabled = true;
            staffNameInput.value = '';
            staffSuggestions.innerHTML = '';
        }
        showDetailsBtn.disabled = true;
        positionBody.classList.remove('position-dynamic-bg');
    });

    staffNameInput.addEventListener('input', (event) => {
        const query = event.target.value;
        if (query.length > 0) {
            filterStaffList(query);
            showDetailsBtn.disabled = true;
            positionBody.classList.add('position-dynamic-bg');
        } else {
            staffSuggestions.innerHTML = '';
            showDetailsBtn.disabled = true;
            positionBody.classList.remove('position-dynamic-bg');
        }
    });

    showDetailsBtn.addEventListener('click', () => {
        const company = companySelect.value;
        const staffName = staffNameInput.value;

        if (company && staffName) {
            const selectedStaff = findStaffMember(company, staffName);
            if (selectedStaff) {
                showDetailsModal(selectedStaff);
            }
        }
    });
    
    // Initial data load
    fetchData(csvUrl).then(data => {
        allData = data;
        populateCompanyDropdown();
        loadingIndicator.style.display = 'none';
        positionFinderSection.style.display = 'flex';
    });
});
