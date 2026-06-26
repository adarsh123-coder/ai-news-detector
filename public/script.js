document.addEventListener('DOMContentLoaded', () => {
    // Main UI elements
    const newsTextInput = document.getElementById('news-text');
    const imageUpload = document.getElementById('image-upload');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const analyzeButton = document.getElementById('analyze-button');
    const loader = document.getElementById('loader');
    const resultsSection = document.getElementById('results-section');
    const resultsContainer = document.getElementById('results-container');
    const errorMessage = document.getElementById('error-message');

    // Feature elements
    const geminiFeatures = document.getElementById('gemini-features');
    const explainBtn = document.getElementById('explain-btn');
    const counterBtn = document.getElementById('counter-btn');
    const explainLoader = document.getElementById('explain-loader');
    const explainResult = document.getElementById('explain-result');
    const counterLoader = document.getElementById('counter-loader');
    const counterResult = document.getElementById('counter-result');

    // State variables
    let base64ImageData = null;
    let currentSummary = '';
    let currentNewsText = '';

    // --- Image upload handler ---
    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreviewContainer.classList.remove('hidden');
                base64ImageData = e.target.result.split(',')[1];
            };
            reader.readAsDataURL(file);
        }
    });

    // --- Analyze button handler ---
    analyzeButton.addEventListener('click', async () => {
        currentNewsText = newsTextInput.value;
        if (!currentNewsText && !base64ImageData) {
            showError("Please provide news text or an image to analyze.");
            return;
        }

        resetUIForAnalysis();

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newsText: currentNewsText, base64ImageData })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || `Request failed with status ${response.status}`);
            }

            if (result.candidates && result.candidates[0]?.content?.parts?.[0]) {
                const responseText = result.candidates[0].content.parts[0].text;
                const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                const data = JSON.parse(jsonString);
                displayResults(data);
            } else {
                throw new Error("Could not get a valid analysis from the AI. The response format was unexpected.");
            }

        } catch (error) {
            showError(`An error occurred: ${error.message}`);
        } finally {
            loader.classList.add('hidden');
            analyzeButton.disabled = false;
        }
    });

    // --- Feature button handler ---
    async function handleFeatureClick(endpoint, payload, resultElem, loaderElem) {
        resultElem.classList.add('hidden');
        loaderElem.classList.remove('hidden');
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `Request to ${endpoint} failed.`);

            if (result.candidates && result.candidates[0]?.content?.parts?.[0]) {
                resultElem.textContent = result.candidates[0].content.parts[0].text;
                resultElem.classList.remove('hidden');
            }
        } catch (error) {
            resultElem.textContent = `Error: ${error.message}`;
            resultElem.classList.remove('hidden');
        } finally {
            loaderElem.classList.add('hidden');
        }
    }

    // --- Explain Like I'm 5 ---
    explainBtn.addEventListener('click', () => {
        handleFeatureClick('/explain', { summary: currentSummary }, explainResult, explainLoader);
    });

    // --- Show Counterarguments ---
    counterBtn.addEventListener('click', () => {
        handleFeatureClick('/counterarguments', { newsText: currentNewsText }, counterResult, counterLoader);
    });

    // --- UI Helper Functions ---
    function displayResults(data) {
        // Verdict
        const verdictHTML = data.is_fake
            ? `<div class="result-fake text-lg font-semibold flex items-center">Verdict: Fake News</div>`
            : `<div class="result-real text-lg font-semibold flex items-center">Verdict: Real News</div>`;

        // Summary
        const summaryHTML = `<div class="${data.is_fake ? 'result-fake' : 'result-real'} mt-2 p-4 rounded-lg"><h4 class="font-semibold">Summary</h4><p class="mt-1 whitespace-pre-wrap">${data.summary || 'No summary provided.'}</p></div>`;

        // Fake news analysis
        const analysisHTML = data.analysis
            ? `<div class="p-4 bg-red-50 rounded-lg mt-2"><h4 class="font-semibold text-red-700">Fake News Analysis</h4><p class="text-red-600 mt-1 whitespace-pre-wrap">${data.analysis}</p></div>`
            : '';

        // Correct news info
        const correctNewsHTML = data.correct_news
            ? `<div class="p-4 bg-blue-50 rounded-lg mt-2"><h4 class="font-semibold text-blue-700">Correct Information</h4><p class="text-blue-600 mt-1 whitespace-pre-wrap">${data.correct_news}</p></div>`
            : '';

        resultsContainer.innerHTML = [verdictHTML, summaryHTML, analysisHTML, correctNewsHTML].join('');
        geminiFeatures.classList.remove('hidden');
        currentSummary = data.summary;
    }

    function resetUIForAnalysis() {
        hideError();
        resultsSection.classList.remove('hidden');
        resultsContainer.innerHTML = '';
        geminiFeatures.classList.add('hidden');
        explainResult.classList.add('hidden');
        counterResult.classList.add('hidden');
        loader.classList.remove('hidden');
        analyzeButton.disabled = true;
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        resultsSection.classList.add('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }
});
