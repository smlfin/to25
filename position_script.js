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

    const csvUrl = 'https://docs.google.com/spreadsheets/d/1_txBXoDUULQramEuC0Ibyhf1Tq2scUrSTRPLA4Z0IQU/export?format=csv&gid=439106858';

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
        const num = parseFloat(value.replace(/,/g, ''));
        if (isNaN(num)) {
            return value;
        }
        return num.toLocaleString('en-IN');
    }

    function getNumericValue(value) {
        if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
            return 0;
        }
        const num = parseFloat(value.replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
    }

    function getAchievementValue(value) {
        if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
            return '-';
        }
        const num = parseFloat(value.replace(/,/g, ''));
        if (isNaN(num) || num === 0) {
            return '-';
        }
        return num.toLocaleString('en-IN');
    }

    function showDetailsModal(data, foreignRank) {
        const outstanding = data['OS AS ON 30.06.2025'] || 'N/A';
        const modalContent = [];
        const contestTotalNet = getNumericValue(data['Contest Total NET']);
        const foreignTripContestTarget = getNumericValue(data['Foreign trip contest Target']);
        const isForeignTargetMet = contestTotalNet >= foreignTripContestTarget;

        const domesticContestTarget = data['Domestic Trip contest target'];
        const domesticFreshCustomerTarget = data['Domestic Trip fresh customer target'];
        const isDomesticApplicable = (domesticContestTarget !== '' && domesticContestTarget !== undefined) || (domesticFreshCustomerTarget !== '' && domesticFreshCustomerTarget !== undefined);
        const domesticRank = isDomesticApplicable ? allData.filter(item => item['COMPANY NAME'] === data['COMPANY NAME'] && item['Domestic Trip contest target']).sort((a,b) => getNumericValue(b['Contest Total NET']) - getNumericValue(a['Contest Total NET'])).findIndex(item => item['STAFF NAME'] === data['STAFF NAME']) + 1 : 'NA';


        modalContent.push(`
            <h2>${data['STAFF NAME']}</h2>
            <p><strong>Company:</strong> ${data['COMPANY NAME']}</p>
            <p><strong>Branch:</strong> ${data['BRANCH']}</p>
            <p><strong>Outstanding:</strong> ${outstanding}</p>
        `);

        // Foreign Trip Contest
        const foreignTripContestAchievement = getNumericValue(data['Contest Total NET']);
        const foreignTripContestShortfall = foreignTripContestTarget - foreignTripContestAchievement;
        const foreignTripIcon = isForeignTargetMet ? '<span class="metric-icon icon-check">&#10004;</span>' : '<span class="metric-icon icon-cross">&#10006;</span>';

        modalContent.push(`
            <h3>Foreign Trip Contest</h3>
            <div class="modal-details-grid">
                <div class="detail-box">
                    <h4 data-tooltip="Total sales for the contest period.">Target</h4>
                    <span class="value">${getFormattedValue(data['Foreign trip contest Target'])}</span>
                </div>
                <div class="detail-box">
                    <h4 data-tooltip="The target amount required to win a foreign trip.">Achievement${foreignTripIcon}</h4>
                    <span class="value">${getAchievementValue(data['Contest Total NET'])}</span>
                </div>
                <div class="detail-box">
                    <h4 data-tooltip="The shortfall amount to reach the target.">Shortfall</h4>
                    <span class="value">${getFormattedValue(foreignTripContestShortfall.toString())}</span>
                </div>
            </div>
        `);
    
        // Domestic Trip Contest and Fresh Customer
        if (isDomesticApplicable) {
            const domesticTripContestTarget = getNumericValue(domesticContestTarget);
            const domesticTripContestAchievement = getNumericValue(data['Contest Total NET']);
            const domesticTripContestShortfall = domesticTripContestTarget - domesticTripContestAchievement;
            const isDomesticContestTargetMet = domesticTripContestAchievement >= domesticTripContestTarget;
            const domesticContestIcon = isDomesticContestTargetMet ? '<span class="metric-icon icon-check">&#10004;</span>' : '<span class="metric-icon icon-cross">&#10006;</span>';

            modalContent.push(`
                <h3>Domestic Trip Contest</h3>
                <div class="modal-details-grid">
                    <div class="detail-box">
                        <h4 data-tooltip="The target amount for the domestic trip contest.">Target</h4>
                        <span class="value">${getFormattedValue(domesticContestTarget)}</span>
                    </div>
                    <div class="detail-box">
                        <h4 data-tooltip="The sales figure achieved for the domestic trip contest.">Achievement${domesticContestIcon}</h4>
                        <span class="value">${getAchievementValue(data['Contest Total NET'])}</span>
                    </div>
                    <div class="detail-box">
                        <h4 data-tooltip="The shortfall amount to reach the domestic trip target.">Shortfall</h4>
                        <span class="value">${getFormattedValue(domesticTripContestShortfall.toString())}</span>
                    </div>
                </div>
            `);

            const domesticTripFreshCustomerTarget = getNumericValue(domesticFreshCustomerTarget);
            const domesticTripFreshCustomerAchievement = getNumericValue(data['FRESH CUSTOMER ACH JULY']);
            const domesticTripFreshCustomerShortfall = domesticTripFreshCustomerTarget - domesticTripFreshCustomerAchievement;
            const isDomesticFreshCustomerTargetMet = domesticTripFreshCustomerAchievement >= domesticTripFreshCustomerTarget;
            const domesticFreshCustomerIcon = isDomesticFreshCustomerTargetMet ? '<span class="metric-icon icon-check">&#10004;</span>' : '<span class="metric-icon icon-cross">&#10006;</span>';

            modalContent.push(`
                <h3>Domestic Trip Fresh Customer</h3>
                <div class="modal-details-grid">
                    <div class="detail-box">
                        <h4 data-tooltip="The number of new customers required for the domestic trip.">Target</h4>
                        <span class="value">${getFormattedValue(domesticFreshCustomerTarget)}</span>
                    </div>
                    <div class="detail-box">
                        <h4 data-tooltip="The number of fresh customers achieved.">Achievement${domesticFreshCustomerIcon}</h4>
                        <span class="value">${getFormattedValue(data['FRESH CUSTOMER ACH JULY'])}</span>
                    </div>
                    <div class="detail-box">
                        <h4 data-tooltip="The shortfall in fresh customers to reach the target.">Shortfall</h4>
                        <span class="value">${getFormattedValue(domesticTripFreshCustomerShortfall.toString())}</span>
                    </div>
                </div>
            `);
        } else {
            modalContent.push(`
                <h3>Domestic Trip</h3>
                <p>Not Applicable</p>
            `);
        }

        // Foreign Trip Fresh Customer
        const foreignTripFreshCustomerTarget = getNumericValue(data['Foreign trip fresh customer target']);
        const foreignTripFreshCustomerAchievement = getNumericValue(data['FRESH CUSTOMER ACH JULY']);
        const foreignTripFreshCustomerShortfall = foreignTripFreshCustomerTarget - foreignTripFreshCustomerAchievement;
        const isForeignFreshCustomerTargetMet = foreignTripFreshCustomerAchievement >= foreignTripFreshCustomerTarget;
        const foreignFreshCustomerIcon = isForeignFreshCustomerTargetMet ? '<span class="metric-icon icon-check">&#10004;</span>' : '<span class="metric-icon icon-cross">&#10006;</span>';

        modalContent.push(`
            <h3>Foreign Trip Fresh Customer</h3>
            <div class="modal-details-grid">
                <div class="detail-box">
                    <h4 data-tooltip="The number of new customers required for the foreign trip.">Target</h4>
                    <span class="value">${getFormattedValue(data['Foreign trip fresh customer target'])}</span>
                </div>
                <div class="detail-box">
                    <h4 data-tooltip="The number of fresh customers achieved.">Achievement${foreignFreshCustomerIcon}</h4>
                    <span class="value">${getFormattedValue(data['FRESH CUSTOMER ACH JULY'])}</span>
                </div>
                <div class="detail-box">
                    <h4 data-tooltip="The shortfall in fresh customers to reach the target.">Shortfall</h4>
                    <span class="value">${getFormattedValue(foreignTripFreshCustomerShortfall.toString())}</span>
                </div>
            </div>
        `);
        
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
                const sortedData = sortData(allData.filter(item => item['COMPANY NAME'] === company));
                const rank = sortedData.findIndex(item => item['STAFF NAME'] === staffName) + 1;
                showDetailsModal(selectedStaff, rank);
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

