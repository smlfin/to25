// personal_search.js (Updated with Prominent Remark Highlight)

document.addEventListener('DOMContentLoaded', () => {
    // Assuming getContestData, calculateSeatsAndRemark, getFormattedValue, etc., 
    // are now available globally from the refactored top_25.js
    
    const staffNameInput = document.getElementById('staffNameInput');
    const searchButton = document.getElementById('searchButton');
    const loadingIndicator = document.getElementById('loading-indicator');
    const resultContainer = document.getElementById('result-container');
    const reportCard = document.getElementById('personal-report-card');
    const nameSuggestions = document.getElementById('nameSuggestions'); 
    
    let allData = [];
    let staffNames = []; 
    let isDataLoaded = false;
    let currentSuggestionIndex = -1; 

    // --- Data Initialization ---
    const initializeData = () => {
        if (!window.getContestData) { 
            loadingIndicator.textContent = "Error: Core data functions not loaded. Ensure top_25.js is the updated version.";
            return;
        }

        window.getContestData().then(data => {
            allData = data;
            // Populate staffNames array with unique names for suggestions
            staffNames = Array.from(new Set(
                allData
                    .map(user => user['STAFF NAME'])
                    .filter(name => name) // Filter out null/empty names
            )).sort(); 
            
            isDataLoaded = true;
            loadingIndicator.style.display = 'none';
            resultContainer.style.display = 'block';
        }).catch(error => {
            console.error("Critical error during data initialization:", error);
            loadingIndicator.textContent = 'Failed to load data. Please ensure the CSV link is correctly published and accessible.';
        });
    };

    // --- Autocomplete Rendering Logic ---
    const renderSuggestions = (matches) => {
        nameSuggestions.innerHTML = '';
        currentSuggestionIndex = -1; 
        
        if (matches.length === 0 || staffNameInput.value.length < 2) {
            nameSuggestions.style.display = 'none';
            staffNameInput.classList.remove('suggestions-open');
            return;
        }

        matches.slice(0, 10).forEach((name, index) => { 
            const div = document.createElement('div');
            div.classList.add('suggestion-item');
            div.textContent = name;
            
            // Highlight the matching part
            const inputVal = staffNameInput.value;
            const matchIndex = name.toUpperCase().indexOf(inputVal.toUpperCase());
            if (matchIndex !== -1) {
                const pre = name.substring(0, matchIndex);
                const match = name.substring(matchIndex, matchIndex + inputVal.length);
                const post = name.substring(matchIndex + inputVal.length);
                div.innerHTML = `${pre}<strong>${match}</strong>${post}`;
            }

            // Click Handler
            div.addEventListener('click', () => {
                staffNameInput.value = name;
                nameSuggestions.style.display = 'none';
                staffNameInput.classList.remove('suggestions-open');
                handleSearch(); 
            });

            nameSuggestions.appendChild(div);
        });

        nameSuggestions.style.display = 'block';
        staffNameInput.classList.add('suggestions-open');
    };

    // --- Input Event Handler ---
    staffNameInput.addEventListener('input', () => {
        const inputVal = staffNameInput.value.trim();

        if (!inputVal || inputVal.length < 2) {
            renderSuggestions([]);
            return;
        }

        const matches = staffNames.filter(name => 
            name.toUpperCase().includes(inputVal.toUpperCase())
        );

        renderSuggestions(matches);
    });
    
    // --- Keyboard Navigation ---
    staffNameInput.addEventListener('keydown', (e) => {
        const items = nameSuggestions.querySelectorAll('.suggestion-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentSuggestionIndex = (currentSuggestionIndex + 1) % items.length;
            updateActiveSuggestion(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentSuggestionIndex = (currentSuggestionIndex - 1 + items.length) % items.length;
            updateActiveSuggestion(items);
        } else if (e.key === 'Enter' && currentSuggestionIndex > -1) {
            e.preventDefault();
            items[currentSuggestionIndex].click(); 
        } else if (e.key === 'Enter' && currentSuggestionIndex === -1) {
             handleSearch(); 
        }
    });
    
    // --- Hide suggestions when clicking outside ---
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-wrapper')) {
            renderSuggestions([]);
        }
    });

    const updateActiveSuggestion = (items) => {
        items.forEach((item, index) => {
            item.classList.toggle('active', index === currentSuggestionIndex);
            if (index === currentSuggestionIndex) {
                staffNameInput.value = item.textContent;
            }
        });
        
        if (currentSuggestionIndex >= 0) {
            items[currentSuggestionIndex].scrollIntoView({ block: 'nearest' });
        }
    };


    // --- Search Handler ---
    const handleSearch = () => {
        if (!isDataLoaded) {
            alert('Data is still loading, please wait a moment.');
            return;
        }
        
        renderSuggestions([]);

        const searchTerm = staffNameInput.value.trim().toUpperCase();
        
        if (!searchTerm) {
            reportCard.innerHTML = '<p class="initial-message">Please enter a name to search.</p>';
            return;
        }

        const employeeData = allData.find(user => 
            user['STAFF NAME'] && user['STAFF NAME'].toUpperCase() === searchTerm
        );

        if (!employeeData) {
            reportCard.innerHTML = `<p class="error-message">❌ Staff member <strong>${searchTerm}</strong> not found. Please check the spelling.</p>`;
            return;
        }

        const intStatus = calculateSeatsAndRemark(employeeData, 'international');
        const domStatus = calculateSeatsAndRemark(employeeData, 'domestic');

        renderPersonalReport(employeeData, intStatus, domStatus);
    };

    // --- Rendering Function ---
    function renderPersonalReport(user, intStatus, domStatus) {
        
        const name = user['STAFF NAME'];
        const company = user['COMPANY NAME'];
        
        const renderContestSection = (status, contestName) => {
            const contestType = contestName.toLowerCase().includes('international') ? 'International' : 'Domestic';
            const icon = contestType === 'International' ? '🌍' : '✈️';
            
            const isTargeted = status.businessTarget > 0;
            
            // Determine highlight class
            const winnerClass = status.seats > 0 ? 'winner-highlight' : '';

            if (!isTargeted) {
                return `
                    <div class="contest-section ${contestType.toLowerCase()}">
                        <h3>${icon} ${contestName} Contest</h3>
                        <p class="not-targeted-message"><strong>N/A</strong>: You were not targeted for the ${contestType} contest.</p>
                    </div>
                `;
            }

            const businessTargetFormatted = getFormattedValue(status.businessTarget);
            const businessAchievementFormatted = getFormattedValue(status.businessAchievement);
            const percentage = status.percentage * 100;

            let statusClass = 'pending';
            if (status.isFullAchiever) {
                statusClass = 'achieved';
            } else if (status.isBusinessAchieved && !status.isFullAchiever) {
                 statusClass = 'warning';
            } else if (status.businessTarget > 0 && status.percentage > 0) {
                 statusClass = 'shortfall';
            }


            return `
                <div class="contest-section ${contestType.toLowerCase()} ${statusClass} ${winnerClass}">
                    <h3>${icon} ${contestName} Contest</h3>
                    ${status.seats > 0 ? `<p style="text-align:center; font-weight:bold; color:#00c853; margin-bottom:10px;">✅ CONGRATULATIONS! You have earned ${status.seats} seat(s)!</p>` : ''}
                    
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${Math.min(percentage, 100).toFixed(2)}%;"></div>
                        <span class="progress-text">${percentage.toFixed(2)}% Achieved</span>
                    </div>

                    <div class="status-grid">
                        <div class="grid-item">
                            <span class="label">Business Target:</span>
                            <span class="value target">${businessTargetFormatted}</span>
                        </div>
                        <div class="grid-item">
                            <span class="label">Business Ach.:</span>
                            <span class="value achievement">${businessAchievementFormatted}</span>
                        </div>
                        <div class="grid-item">
                            <span class="label">F.C. Target:</span>
                            <span class="value target">${status.freshCustomerTarget}</span>
                        </div>
                        <div class="grid-item">
                            <span class="label">F.C. Ach.:</span>
                            <span class="value achievement">${status.freshCustomerAchievement}</span>
                        </div>
                        <div class="grid-item full-width highlight">
                            <span class="label seat-label">Potential Seats Earned:</span>
                            <span class="value seat-value">${status.seats}</span>
                        </div>
                    </div>

                    <div class="remark-highlight-box">
                        <strong>STATUS REMARK:</strong> ${status.remark}
                    </div>
                </div>
            `;
        };
        
        // 1. Render both sections
        const internationalSection = renderContestSection(intStatus, 'International Trip');
        const domesticSection = renderContestSection(domStatus, 'Domestic Trip');
        
        // 2. Determine the order dynamically
        const internationalWon = intStatus.seats > 0;
        const domesticWon = domStatus.seats > 0;
        
        let reportContentHTML = '';

        if (domesticWon && !internationalWon) {
            // Case: Won Domestic, but not International -> Domestic first
            reportContentHTML = domesticSection + internationalSection;
        } else {
            // Default Case: Won International (or both, or neither) -> International first
            reportContentHTML = internationalSection + domesticSection;
        }
        
        // 3. Assemble the final HTML
        const html = `
            <div class="personal-card-header">
                <h2>Hello, <strong>${name}</strong>!</h2>
                <p class="company-info">Company: <strong>${company}</strong></p>
                <div class="separator"></div>
            </div>
            
            <div class="report-content">
                ${reportContentHTML}
            </div>

            <p class="disclaimer">Note: Seats and remarks are based on real-time data and internal contest rules. Final approval is subject to management decision.</p>
        `;

        reportCard.innerHTML = html;
    }


    // --- Event Listeners ---
    searchButton.addEventListener('click', handleSearch);
    staffNameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && currentSuggestionIndex === -1) { 
            handleSearch();
        }
    });

    initializeData();
});