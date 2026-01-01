// top_25.js (Updated for Global Reusability and Single Fetch)

// --- CONSTANTS & DATA URL (Defined globally) ---
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTlys14AiGHJNcXDBF-7tgiPZhIPN4Kl90Ml5ua9QMivwQz0_8ykgI-jo8fB3c9TZnUrMjF2Xfa3FO5/pub?gid=439106858&single=true&output=csv';

const INT_BUSINESS_TARGET_KEY = 'Foreign trip contest Target';
const DOM_BUSINESS_TARGET_KEY = 'Domestic Trip contest target';
const INT_FRESH_CUST_TARGET_KEY = 'Foreign trip fresh customer target';
const DOM_FRESH_CUST_TARGET_KEY = 'Domestic Trip fresh customer target';
const CONTEST_ACHIEVEMENT_KEY = 'Contest Total NET';
const FRESH_CUSTOMER_ACH_KEY = 'FRESH CUSTOMER ACH JULY';

// --- Helper Functions (Now Global for Reuse in personal_search.js) ---
function getNumericValue(value) {
    if (!value) return 0;
    return parseFloat(String(value).replace(/[^0-9.\-]/g, "") || 0);
}

function getFormattedValue(value) {
    const num = getNumericValue(value);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(num);
}

function getShortCompanyName(companyName) {
    switch (companyName) {
        case 'VANCHINAD FINANCE LTD': return 'VFL';
        case 'SML FINANCE LTD': return 'SML';
        case 'SANGEETH NIDHI LTD': return 'SNL';
        default:
            if (companyName) {
                const parts = companyName.split(' ');
                if (parts.length > 2) { return parts.map(p => p[0]).join(''); } 
            }
            return companyName || 'N/A';
    }
}

function parseCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 1) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = [];
        let inQuotes = false;
        let start = 0;
        for (let j = 0; j < line.length; j++) {
            if (line[j] === '"') { inQuotes = !inQuotes; } 
            else if (line[j] === ',' && !inQuotes) {
                let value = line.substring(start, j).trim().replace(/^"|"$/g, '');
                values.push(value);
                start = j + 1;
            }
        }
        let lastValue = line.substring(start).trim().replace(/^"|"$/g, '');
        values.push(lastValue);
        
        const rowObject = {};
        headers.forEach((header, index) => {
            rowObject[header] = values[index] !== undefined ? values[index] : '';
        });
        data.push(rowObject);
    }
    return data;
}

// --- Core Seat Calculation Logic (Now Global) ---
function calculateSeatsAndRemark(user, contestType) {
    const businessTargetKey = contestType === 'domestic' ? DOM_BUSINESS_TARGET_KEY : INT_BUSINESS_TARGET_KEY;
    const freshTargetKey = contestType === 'domestic' ? DOM_FRESH_CUST_TARGET_KEY : INT_FRESH_CUST_TARGET_KEY;

    const businessTarget = getNumericValue(user[businessTargetKey]);
    const businessAchievement = getNumericValue(user[CONTEST_ACHIEVEMENT_KEY]);
    const freshCustomerTarget = getNumericValue(user[freshTargetKey]);
    const freshCustomerAchievement = getNumericValue(user[FRESH_CUSTOMER_ACH_KEY]); 

    let seats = 0;
    let remark = '';
    const ADDITIONAL_SEAT_BUSINESS = 7000000;

    const isBusinessAchieved = businessAchievement >= businessTarget;
    const isFreshCustAchieved = freshCustomerAchievement >= freshCustomerTarget;
    const isFullAchiever = isBusinessAchieved && isFreshCustAchieved;

    if (isBusinessAchieved) {
        seats = 1; 
        const surplus = businessAchievement - businessTarget;

        if (surplus > 0) {
            seats += Math.floor(surplus / ADDITIONAL_SEAT_BUSINESS);
        }

        if (isFreshCustAchieved) {
            remark = 'All targets achieved. Congratulations!';
        } else {
            const freshCustomerShortfall = freshCustomerTarget - freshCustomerAchievement;
            remark = `Seats subject to Fresh Customer target achievement (Shortfall: ${freshCustomerShortfall} Cust.)`;
        }
    } else {
        const businessShortfall = businessTarget - businessAchievement;
        seats = 0;
        const shortfallDisplay = businessTarget > 0 ? getFormattedValue(businessShortfall) : 'N/A';
        remark = `Business Shortfall: ${shortfallDisplay}`;
    }

    const percentage = businessTarget > 0 ? (businessAchievement / businessTarget) : 0;

    return { 
        seats, 
        remark, 
        businessTarget, 
        freshCustomerTarget, 
        businessAchievement,
        freshCustomerAchievement,
        isFullAchiever,
        isBusinessAchieved,
        percentage
    };
}


// --- Single Data Fetcher Function (The core fix for 'Body consumed') ---
let dataPromise = null;
window.getContestData = () => {
    if (dataPromise) return dataPromise; // Return existing promise if already fetching or fetched.

    // This handles the actual fetch and parsing once.
    dataPromise = fetch(CSV_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            return parseCSV(text); 
        })
        .catch(error => {
            console.error('Error fetching or parsing CSV in getContestData:', error);
            dataPromise = null; // Reset promise on failure to allow retry
            throw error;
        });

    return dataPromise;
};


// --- Main Ranking Function (Uses global helpers) ---
const processContestData = (contestType) => {
    // This logic remains the same, assuming 'allData' is passed in the main execution block
    // as it was before, but now received from the getContestData promise.
    // ... (This function is only called inside the DOMContentLoaded block below) ...
    // Note: To run this, it requires the full data set to be passed. The rest of the function remains identical.
    
    return (data) => {
        const businessTargetKey = contestType === 'domestic' ? DOM_BUSINESS_TARGET_KEY : INT_BUSINESS_TARGET_KEY;
        
        let eligiblePerformers = data.filter(item => getNumericValue(item[businessTargetKey]) > 0);
        
        const performersWithStatus = eligiblePerformers.map(user => {
            return {
                ...user,
                status: calculateSeatsAndRemark(user, contestType)
            };
        }).filter(p => p.status.percentage > 0);
        
        let fullAchievers = performersWithStatus.filter(p => p.status.isFullAchiever);
        let remainingPerformers = performersWithStatus.filter(p => !p.status.isFullAchiever);
        
        const percentageSort = (pA, pB) => pB.status.percentage - pA.status.percentage;

        fullAchievers.sort(percentageSort);
        remainingPerformers.sort(percentageSort);
        
        let finalList = fullAchievers.concat(remainingPerformers);
        
        finalList = finalList.slice(0, 30); 

        console.log(`--- Top 30 Performers for ${contestType.toUpperCase()} (For Debugging) ---`);
        finalList.slice(0, 30).forEach((p, index) => {
            console.log(`Rank ${index + 1}: ${p['STAFF NAME']} (${(p.status.percentage * 100).toFixed(2)}%) - Full Achiever: ${p.status.isFullAchiever}`);
        });
        console.log('----------------------------------------------------');

        return finalList;
    };
};

// --- RENDERING FUNCTION (Now includes null check for robustness) ---
function renderReport(performers, targetElementId, contestType) {
    const targetElement = document.getElementById(targetElementId);

    // CRITICAL FIX for 'targetElement is null' error
    if (!targetElement) {
        console.error(`Rendering failed: Target element with ID '${targetElementId}' not found.`);
        return;
    }
    
    targetElement.innerHTML = ''; 

    if (performers.length === 0) {
        targetElement.innerHTML = '<p class="tagline" style="text-align:center; padding: 20px;">No performers currently meet the target criteria for display (Target > 0 and Achievement > 0).</p>';
        return;
    }

    let tableHTML = `
        <div class="table-scroll-wrapper">
            <table class="report-table">
                <thead>
                    <tr>
                        <th class="rank-cell">Rank</th>
                        <th class="name-cell">Name</th>
                        <th>Company</th>
                        <th class="perc-cell">Ach. %</th>
                        <th class="target-cell">Business Target</th>
                        <th class="achiev-cell">Business Ach.</th>
                        <th class="target-cell">F.C. Target</th>
                        <th class="achiev-cell">F.C. Ach.</th>
                        <th class="seats-cell">Seats</th>
                        <th>Remark</th>
                    </tr>
                </thead>
                <tbody>
    `;

    performers.forEach((p, index) => {
        const rank = index + 1;
        const user = p;
        const status = p.status;
        
        const { seats, remark, businessTarget, freshCustomerTarget, businessAchievement, freshCustomerAchievement, isBusinessAchieved } = status;
        const shortCompanyName = getShortCompanyName(user['COMPANY NAME']);
        
        const achievementClass = isBusinessAchieved ? 'achieved' : 'shortfall';
        const percentage = status.percentage * 100;

        const isFreshCustAchieved = freshCustomerAchievement >= freshCustomerTarget;
        const freshCustClass = freshCustomerTarget > 0 ? (isFreshCustAchieved ? 'achieved' : 'shortfall') : '';

        const rankCellClass = status.isFullAchiever ? 'rank-cell full-achiever-rank' : 'rank-cell';

        tableHTML += `
            <tr>
                <td class="${rankCellClass}" data-label="Rank:">#${rank}</td>
                <td class="name-cell" data-label="Name:">${user['STAFF NAME']}</td>
                <td data-label="Company:">${shortCompanyName}</td>
                <td class="perc-cell ${achievementClass}" data-label="Ach. %:">${percentage.toFixed(2)}%</td>
                <td class="target-cell" data-label="Business Target:">${getFormattedValue(businessTarget)}</td>
                <td class="achiev-cell ${achievementClass}" data-label="Business Ach.:">${getFormattedValue(businessAchievement)}</td>
                <td class="target-cell" data-label="F.C. Target:">${freshCustomerTarget}</td>
                <td class="achiev-cell ${freshCustClass}" data-label="F.C. Ach.:">${freshCustomerAchievement}</td>
                <td class="seats-cell" data-label="Seats:">${seats}</td>
                <td class="remark-cell" data-label="Remark:">${remark}</td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
    `;
    targetElement.innerHTML = tableHTML;
}

// --- Main Execution Block ---
document.addEventListener('DOMContentLoaded', () => {
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // Use the single data fetcher
    window.getContestData().then(data => {
        const finalInternationalList = processContestData('international')(data);
        const finalDomesticList = processContestData('domestic')(data);
        
        // This will now use the robust renderReport function
        renderReport(finalInternationalList, 'international-report', 'international');
        renderReport(finalDomesticList, 'domestic-report', 'domestic');
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }

    }).catch(error => {
        console.error("Critical error during fetch or rendering:", error);
        if (loadingIndicator) {
            loadingIndicator.textContent = "Failed to load report data. Please check the data source and console for details.";
        }
    });
});

