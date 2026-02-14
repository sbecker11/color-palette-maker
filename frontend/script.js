const form = document.getElementById('uploadForm');
const fileList = document.getElementById('fileList');
const viewer = document.getElementById('imageViewer');
const imgElement = document.getElementById('displayedImage');
const placeholder = viewer.querySelector('.placeholder');
const messageArea = document.getElementById('messageArea');
const themeToggleButton = document.getElementById('themeToggleButton');
const paletteDisplayArea = document.getElementById('paletteDisplay'); 
const paletteNameInput = document.getElementById('paletteNameInput'); // Get palette name input
const imageCanvas = document.getElementById('imageCanvas'); // Restore canvas element
const canvasCtx = imageCanvas.getContext('2d', { willReadFrequently: true }); // Restore context
const exportButton = document.getElementById('exportPaletteButton'); // Get export button
let currentlySelectedListItem = null; // Track selected LI
let isSamplingMode = false; // Restore state variable
let currentSampledColor = null; // Restore state variable

// --- Theme Toggling ---
function setTheme(themeName) {
    localStorage.setItem('theme', themeName);
    document.body.dataset.theme = themeName;
    themeToggleButton.textContent = themeName === 'dark' ? 'Light Mode' : 'Dark Mode';
}

function toggleTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        setTheme('light');
    } else {
        setTheme('dark');
    }
}

// Immediately invoked function to set the theme on initial load
(function () {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') {
        setTheme('dark');
    } else {
         setTheme('light'); // Default to light
    }
})();

themeToggleButton.addEventListener('click', toggleTheme);

// --- Input Type Toggling ---
function toggleInput(type) {
  const fileGroup = document.getElementById('fileInputGroup');
  const urlGroup = document.getElementById('urlInputGroup');
  const fileInput = document.getElementById('imageFile');
  const urlInput = document.getElementById('imageUrl');

  if (type === 'file') {
    fileGroup.classList.remove('hidden');
    urlGroup.classList.add('hidden');
    fileInput.required = true;
    urlInput.required = false;
  } else if (type === 'url') {
    fileGroup.classList.add('hidden');
    urlGroup.classList.remove('hidden');
    fileInput.required = false;
    urlInput.required = true;
  }
}

// --- Image Display ---
function showImage(imageUrl, listItem, event = null) {
    // Exit sampling mode if active when a new image is selected
    if (isSamplingMode) {
        exitSamplingMode();
    }

    console.log('[Image Select] Showing image:', imageUrl);
    if (event) event.preventDefault();
    imgElement.src = imageUrl;
    imgElement.style.display = 'block';
    placeholder.style.display = 'none';

    // Highlight Logic
    if (currentlySelectedListItem) {
        currentlySelectedListItem.classList.remove('selected-image');
    }
    if (listItem && listItem.tagName === 'LI') {
        listItem.classList.add('selected-image');
        currentlySelectedListItem = listItem;

        // Display Metadata & Palette
        try {
            const metaString = listItem.dataset.metadata;
            if (metaString) {
                const meta = JSON.parse(metaString);
                displayMetadata(meta);

                // --- Palette Name Logic ---
                const filenameWithoutExt = meta.cachedFilePath ? meta.cachedFilePath.split('/').pop().replace(/\.[^/.]+$/, "") : "";
                paletteNameInput.value = meta.paletteName || filenameWithoutExt;
                paletteNameInput.disabled = false;
                // --- End Palette Name Logic ---

                // Palette Logic - Check if needs generation
                if (meta.colorPalette && Array.isArray(meta.colorPalette) && meta.colorPalette.length > 0) {
                    console.log('[Palette] Found existing palette in metadata.');
                    displayPalette(meta.colorPalette); // Display existing palette
                } else {
                    console.log('[Palette] No valid existing palette found. Requesting generation...');
                    displayPalette(null, true); // Show "Generating..." placeholder
                    generateAndDisplayPalette(imageUrl, listItem, meta); // Trigger generation
                }
                // End Palette Logic

            } else {
                console.warn('[Image Select] No metadata found on list item.');
                displayMetadata(null);
                displayPalette(null);
                paletteNameInput.value = '';
                paletteNameInput.disabled = true;
            }
        } catch (e) {
            console.error('[Image Select] Error parsing metadata or handling palette:', e);
            displayMetadata(null);
            displayPalette(null);
            paletteNameInput.value = '';
            paletteNameInput.disabled = true;
        }
    } 
    // Draw image to canvas whenever image is shown
    drawImageToCanvas(imageUrl);
}

// --- Draw image to hidden canvas ---
function drawImageToCanvas(imageUrl) {
    const img = new Image();
    img.crossOrigin = "Anonymous"; 
    img.onload = () => {
        console.log('[Canvas] Image loaded for canvas drawing.');
        imageCanvas.width = img.naturalWidth;
        imageCanvas.height = img.naturalHeight;
        canvasCtx.drawImage(img, 0, 0);
        console.log(`[Canvas] Image drawn to canvas (${imageCanvas.width}x${imageCanvas.height})`);
    };
    img.onerror = (err) => {
        console.error('[Canvas] Error loading image onto canvas:', err);
        canvasCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    };
    img.src = imageUrl;
}

// --- Generate Palette via API ---
async function generateAndDisplayPalette(imageUrl, listItem, meta) {
    const filename = imageUrl.split('/').pop();
    if (!filename) { console.error('[Palette API] Could not extract filename from URL:', imageUrl); displayPalette(null); return; }
    try {
        const response = await fetch('/api/palette/' + encodeURIComponent(filename), { method: 'POST' });
        console.log('[Palette API] Raw response status:', response.status);
        const result = await response.json();
        if (response.ok && result.success) {
            console.log('[Palette API] Received palette for ' + filename + ':', result.palette);
            meta.colorPalette = result.palette;
            listItem.dataset.metadata = JSON.stringify(meta);
            displayPalette(result.palette);
        } else {
            console.error('[Palette API] Failed to generate palette for ' + filename + ':', result ? result.message : 'No JSON response');
            displayPalette(null);
        }
    } catch (error) {
        console.error('[Palette API] Network or fetch error for ' + filename + ':', error);
        displayPalette(null);
    }
}

// --- Message Display ---
function showMessage(message, isError = false) {
    messageArea.textContent = message;
    messageArea.className = 'messageArea';
    if (message) { messageArea.classList.add(isError ? 'message-error' : 'message-success'); }
    setTimeout(() => { messageArea.textContent = ''; messageArea.className = 'messageArea'; }, 5000);
}

// --- Populate File List ---
async function loadImageList() {
    showMessage('Loading image list...');
    currentlySelectedListItem = null; displayMetadata(null); displayPalette(null); paletteNameInput.disabled = true;
    try {
        const response = await fetch('/api/images');
        const data = await response.json();
        fileList.innerHTML = '';
        if (response.ok && data.success && data.images.length > 0) {
            data.images.forEach(meta => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                const filename = meta.cachedFilePath ? meta.cachedFilePath.split('/').pop() : 'unknown';
                const imageUrl = '/uploads/' + encodeURIComponent(filename);
                li.dataset.metadata = JSON.stringify(meta);
                a.href = imageUrl;
                // Determine display name: Use paletteName if it exists and differs from default, otherwise use filename
                const filenameWithoutExt = filename.includes('.') ? filename.substring(0, filename.lastIndexOf('.')) : filename;
                const displayName = (meta.paletteName && meta.paletteName !== filenameWithoutExt) ? meta.paletteName : filename;
                // Set link text
                a.textContent = displayName + (meta.width && meta.height ? ' (' + meta.width + 'x' + meta.height + ') ' : ' ');
                // Tooltip remains the same, showing detailed info
                a.title = 'Filename: ' + filename + ' | Format: ' + (meta.format || '?') + ', Size: ' + (meta.fileSizeBytes ? Math.round(meta.fileSizeBytes / 1024) + ' KB' : '?') + ', Added: ' + (meta.createdDateTime ? new Date(meta.createdDateTime).toLocaleString() : '?');
                a.onclick = (e) => showImage(imageUrl, li, e);
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.style.marginLeft = '5px'; deleteButton.style.fontSize = '0.8em'; deleteButton.style.padding = '2px 5px';
                deleteButton.onclick = () => deleteImage(filename, li);
                li.appendChild(a); li.appendChild(deleteButton); fileList.appendChild(li);
            });
            const firstListItem = fileList.firstChild;
            if (firstListItem) {
                const firstLink = firstListItem.querySelector('a');
                if (firstLink) { showImage(firstLink.href, firstListItem); }
            }
            showMessage('');
        } else if (data.images && data.images.length === 0) {
            fileList.innerHTML = '<li>No images stored.</li>'; showMessage('');
        } else {
            const errorMsg = 'Error: ' + (data.message || 'Could not load images');
            fileList.innerHTML = '<li>' + errorMsg + '</li>'; showMessage(errorMsg, true);
        }
    } catch (error) {
        console.error('Failed to load image list:', error);
        const errorMsg = 'Error loading image list.';
        fileList.innerHTML = '<li>' + errorMsg + '</li>'; showMessage(errorMsg, true);
    }
}

// --- Display Metadata Function ---
function displayMetadata(meta) {
    const displayArea = document.getElementById('metadataDisplay');
    if (!displayArea) return;

    if (meta) {
         let source = 'N/A';
         if (meta.uploadedURL) {
            source = 'URL: <a href="' + meta.uploadedURL + '" target="_blank" rel="noopener noreferrer">' + meta.uploadedURL + '</a>';
         } else if (meta.uploadedFilePath) {
            source = 'Local: ' + meta.uploadedFilePath;
         }
        
        let sizeStr = 'N/A';
        if (typeof meta.fileSizeBytes === 'number') {
            if (meta.fileSizeBytes > 1024 * 1024) {
                sizeStr = (meta.fileSizeBytes / (1024 * 1024)).toFixed(2) + ' MB';
            } else if (meta.fileSizeBytes > 1024) {
                sizeStr = (meta.fileSizeBytes / 1024).toFixed(1) + ' KB';
            } else {
                sizeStr = meta.fileSizeBytes + ' Bytes';
            }
        }
        
        const filename = meta.cachedFilePath ? meta.cachedFilePath.split('/').pop() : 'unknown';
        const dimensions = (meta.width && meta.height) ? meta.width + ' x ' + meta.height : 'N/A';
        const format = meta.format || 'N/A';
        const added = meta.createdDateTime ? new Date(meta.createdDateTime).toLocaleString() : 'N/A';

        displayArea.innerHTML = 
            '<h3>Palette image info</h3>' +
            '<ul>' +
                '<li><strong>Filename:</strong> ' + filename + '</li>' +
                '<li><strong>Dimensions:</strong> ' + dimensions + '</li>' +
                '<li><strong>Format:</strong> ' + format + '</li>' +
                '<li><strong>Size:</strong> ' + sizeStr + '</li>' +
                '<li><strong>Source:</strong> ' + source + '</li>' +
                '<li><strong>Added:</strong> ' + added + '</li>' +
            '</ul>';
    } else {
        displayArea.innerHTML = 
            '<h3>Palette image info</h3>' +
            '<span class="placeholder">Select an image from the list below.</span>';
    }
}

// --- Display Palette Function ---
function displayPalette(palette, isGenerating = false) {
    if (!paletteDisplayArea) return;
    paletteDisplayArea.innerHTML = ''; 

    if (isGenerating) {
         paletteDisplayArea.innerHTML = '<span class="placeholder">Generating palette...</span>';
         // Don't add the '+' button while generating
         return; 
    }

    // Render actual palette if it exists
    if (palette && Array.isArray(palette) && palette.length > 0) {
        console.log(`[displayPalette] Rendering ${palette.length} actual swatches.`); // Log before loop
        palette.forEach((hexColor, index) => {
            console.log(`[displayPalette]   - Creating swatch ${index}: ${hexColor}`); // Log inside loop
            const itemDiv = document.createElement('div'); itemDiv.className = 'palette-item';
            const colorCircle = document.createElement('div'); colorCircle.className = 'palette-color'; colorCircle.style.backgroundColor = hexColor; colorCircle.title = hexColor;
            const colorLabel = document.createElement('span'); colorLabel.className = 'palette-label'; colorLabel.textContent = hexColor;
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'swatch-delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.title = 'Delete swatch';
            deleteBtn.onclick = (event) => {
                event.stopPropagation();
                handleSwatchDelete(hexColor);
            };
            itemDiv.appendChild(colorCircle); itemDiv.appendChild(colorLabel); itemDiv.appendChild(deleteBtn);
            paletteDisplayArea.appendChild(itemDiv);
            console.log(`[displayPalette]   - Appended swatch ${index}`); // Log after append
        });
    } else {
        // Add log for when palette is empty/invalid
        console.log('[displayPalette] No actual swatches to render (palette empty or invalid).'); 
    }

    // <<<< START TEST CODE: Placeholder Swatch >>>>
    const testHexColor = '#888888'; // Base value, not displayed
    // console.log(`[Test] Adding placeholder swatch.`); // Reduce logging
    const testItemDiv = document.createElement('div');
    testItemDiv.className = 'palette-item';
    testItemDiv.title = 'Click to sample color from image'; // Initial title
    testItemDiv.onclick = toggleSamplingMode; // Click the container to toggle sampling

    const testColorCircle = document.createElement('div');
    testColorCircle.className = 'palette-color test-placeholder-swatch'; 
    testColorCircle.style.backgroundColor = 'transparent';
    // testColorCircle.title = 'Test Placeholder'; // Title now on itemDiv

    const testColorLabel = document.createElement('span');
    testColorLabel.className = 'palette-label test-placeholder-label';
    testColorLabel.textContent = testHexColor; // Keep for geometry

    testItemDiv.appendChild(testColorCircle);
    testItemDiv.appendChild(testColorLabel);
    paletteDisplayArea.appendChild(testItemDiv);
    
    // Update placeholder appearance based on sampling state
    if (isSamplingMode && currentSampledColor) {
         testColorCircle.classList.add('sampling'); // Add sampling class for potential style changes
         testColorCircle.style.backgroundColor = currentSampledColor; // Show sampled color
         testItemDiv.title = `Double-click image to add ${currentSampledColor}. Click swatch to cancel.`; 
    } else if (isSamplingMode) {
        testColorCircle.classList.add('sampling'); // Add sampling class
        testColorCircle.style.backgroundColor = 'transparent'; // Ensure transparent if no color sampled yet
        testItemDiv.title = 'Double-click image to pick color. Click swatch to cancel sampling.'; 
    } else {
        testColorCircle.classList.remove('sampling'); // Ensure sampling class is removed
        testColorCircle.style.backgroundColor = 'transparent';
        testItemDiv.title = 'Click to sample color from image';
    }
    // <<<< END TEST CODE >>>>

    // Handle placeholder message if palette is empty AND not generating
    if (!isGenerating && (!palette || !Array.isArray(palette) || palette.length === 0)) {
         const existingPlaceholder = paletteDisplayArea.querySelector('.placeholder');
         if (existingPlaceholder) existingPlaceholder.remove();
         const placeholderSpan = document.createElement('span');
         placeholderSpan.className = 'placeholder';
         placeholderSpan.textContent = 'No color palette extracted for this image.';
         paletteDisplayArea.insertBefore(placeholderSpan, testItemDiv); // Insert before placeholder swatch
    }
}

// --- Sampling Functions --- 
// Renamed from handleAddSwatchClick
function toggleSamplingMode() { 
    if (!currentlySelectedListItem) {
        showMessage('Select an image first.', true);
        return;
    }
    if (!isSamplingMode) {
        enterSamplingMode();
    } else {
        exitSamplingMode(); // Clicking placeholder while sampling cancels
    }
}

// NEW function to enter sampling
function enterSamplingMode() {
    console.log('[Sampling] Entering sampling mode.');
    isSamplingMode = true;
    currentSampledColor = null;
    document.body.classList.add('sampling-active');
    viewer.addEventListener('mousemove', handleImageViewerMouseMove);
    viewer.addEventListener('mouseleave', handleImageViewerMouseLeave);
    viewer.addEventListener('dblclick', handleImageViewerDoubleClick); 
    // Log the palette we are about to pass
    const currentPalette = getCurrentPaletteFromMeta();
    console.log('[Sampling] Palette data before redraw in enterSamplingMode:', JSON.stringify(currentPalette));
    displayPalette(currentPalette, false); // Update placeholder appearance
}

function handleImageViewerDoubleClick(event) {
    event.preventDefault(); event.stopPropagation();
    if (!isSamplingMode) return;
    console.log('[Sampling] Double-click detected.');
    if (currentSampledColor) {
         console.log(`[Sampling] Attempting to add color via double-click: ${currentSampledColor}`);
         try {
             const metaString = currentlySelectedListItem.dataset.metadata;
             const meta = JSON.parse(metaString);
             if (!meta.colorPalette) meta.colorPalette = []; 
             if (!meta.colorPalette.includes(currentSampledColor)) {
                 meta.colorPalette.push(currentSampledColor);
                 currentlySelectedListItem.dataset.metadata = JSON.stringify(meta);
                 savePaletteUpdate(meta); 
                 console.log('[Sampling] Color added via double-click.');
                 displayPalette(meta.colorPalette, false); // Redraw with new color, placeholder appearance updates
             } else {
                 console.log('[Sampling] Color already exists in palette.');
             }
         } catch(e) {
             console.error('[Sampling] Error adding sampled color:', e);
             showMessage('Error adding color.', true);
         }
    } else {
        console.log('[Sampling] Double-clicked, but no valid color was sampled recently.');
    }
    // Stay in sampling mode: call displayPalette handled above
}

function handleImageViewerMouseMove(event) {
    if (!isSamplingMode || !canvasCtx || !imgElement.complete || imgElement.naturalWidth === 0) {
        // Don't sample if not in mode, or if image/canvas isn't ready
        return;
    }

    // --- Accurate Coordinate Calculation (Handles object-fit: cover) ---
    const imgRect = imgElement.getBoundingClientRect(); // Position of the displayed image element
    const canvasWidth = imageCanvas.width;
    const canvasHeight = imageCanvas.height;
    const imgDispWidth = imgElement.clientWidth;  // Displayed width of <img>
    const imgDispHeight = imgElement.clientHeight; // Displayed height of <img>

    // Mouse coordinates relative to the displayed <img> element
    const mouseX = event.clientX - imgRect.left;
    const mouseY = event.clientY - imgRect.top;

    // Calculate the scaling factor and offsets introduced by object-fit: cover
    const canvasRatio = canvasWidth / canvasHeight;
    const imgDispRatio = imgDispWidth / imgDispHeight;
    let scale = 1, offsetX = 0, offsetY = 0;

    if (canvasRatio > imgDispRatio) { 
        // Canvas is wider than display area: Fit height, crop/offset width
        scale = canvasHeight / imgDispHeight;
        const scaledWidth = canvasWidth / scale;
        offsetX = (scaledWidth - imgDispWidth) / 2;
    } else {
        // Canvas is taller than display area: Fit width, crop/offset height
        scale = canvasWidth / imgDispWidth;
        const scaledHeight = canvasHeight / scale;
        offsetY = (scaledHeight - imgDispHeight) / 2;
    }

    // Calculate corresponding coordinates on the original canvas
    const canvasX = Math.floor((mouseX + offsetX) * scale);
    const canvasY = Math.floor((mouseY + offsetY) * scale);

    // Clamp coordinates to canvas bounds
    const x = Math.max(0, Math.min(canvasX, canvasWidth - 1));
    const y = Math.max(0, Math.min(canvasY, canvasHeight - 1));
    // --- End Coordinate Calculation ---

    const sampleSize = 1; 
    let r = 0, g = 0, b = 0;
    let count = 0;
    try {
        const pixelData = canvasCtx.getImageData(x, y, 1, 1).data;
        r = pixelData[0]; g = pixelData[1]; b = pixelData[2]; count = 1;
    } catch (e) {
        console.error("[Sampling] Error getting pixel data at:", x, y, e);
        count = 0;
    }

    if (count > 0) {
        currentSampledColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        
        // Update the TEST placeholder swatch UI immediately
        const placeholderSwatch = paletteDisplayArea.querySelector('.test-placeholder-swatch');
        const placeholderItem = placeholderSwatch ? placeholderSwatch.closest('.palette-item') : null;
        if (placeholderSwatch && placeholderItem) {
            placeholderSwatch.classList.add('sampling');
            placeholderSwatch.style.backgroundColor = currentSampledColor;
            placeholderItem.title = `Double-click image to add ${currentSampledColor}. Click swatch to cancel.`; // Update title dynamically
            // Plus sign is hidden via CSS .sampling rule
        }
    } else { 
        currentSampledColor = null; 
         // Optionally reset placeholder background if sampling failed?
         const placeholderSwatch = paletteDisplayArea.querySelector('.test-placeholder-swatch');
         if (placeholderSwatch) {
            placeholderSwatch.style.backgroundColor = 'transparent';
            // Plus sign is restored via CSS when .sampling removed
         }
    }
}

function handleImageViewerMouseLeave() {
    if (isSamplingMode) { 
        console.log('[Sampling] Mouse left viewer.'); 
        // Reset sampled color visually when mouse leaves?
        currentSampledColor = null;
        const placeholderSwatch = paletteDisplayArea.querySelector('.test-placeholder-swatch');
        const placeholderItem = placeholderSwatch ? placeholderSwatch.closest('.palette-item') : null;
        if (placeholderSwatch && placeholderItem) {
            placeholderSwatch.style.backgroundColor = 'transparent';
            placeholderItem.title = 'Double-click image to pick color. Click swatch to cancel sampling.';
             // Restore the '+' sign using ::before style change (see CSS step)
        }
    }
}

function exitSamplingMode() {
    if (!isSamplingMode) return;
    console.log('[Sampling] Cleaning up and exiting sampling mode.');
    viewer.removeEventListener('mousemove', handleImageViewerMouseMove);
    viewer.removeEventListener('mouseleave', handleImageViewerMouseLeave);
    viewer.removeEventListener('dblclick', handleImageViewerDoubleClick); 
    isSamplingMode = false;
    currentSampledColor = null;
    document.body.classList.remove('sampling-active'); 
    displayPalette(getCurrentPaletteFromMeta(), false); 
}

// --- Utility Function: Get Current Palette from Metadata ---
function getCurrentPaletteFromMeta() {
    console.log('[getCurrentPalette] Checking currentlySelectedListItem:', currentlySelectedListItem);
    if (!currentlySelectedListItem) { 
        console.log('[getCurrentPalette] No item selected, returning [].');
        return []; 
    }
    try { 
        const metaString = currentlySelectedListItem.dataset.metadata;
        console.log('[getCurrentPalette] Raw metaString:', metaString);
        if (!metaString) { 
            console.log('[getCurrentPalette] metaString is empty/null, returning [].');
            return []; 
        }
        const meta = JSON.parse(metaString);
        console.log('[getCurrentPalette] Parsed meta object:', meta);
        // Explicitly check if colorPalette exists before returning
        if (meta && meta.colorPalette && Array.isArray(meta.colorPalette)) {
            console.log('[getCurrentPalette] Returning meta.colorPalette:', meta.colorPalette);
            return meta.colorPalette; 
        } else {
            console.log('[getCurrentPalette] meta.colorPalette is missing or not an array, returning [].');
            return [];
        }
    } catch (e) { 
        console.error('[getCurrentPalette] Error parsing metadata:', e);
        return []; // Return empty array on error
    }
}

// --- Handle Swatch Deletion ---
function handleSwatchDelete(hexColorToDelete) {
    console.log(`[Swatch Delete] Attempting to delete: ${hexColorToDelete}`);
    if (!currentlySelectedListItem) {
        console.error('[Swatch Delete] No list item selected.');
        return;
    }

    try {
        const metaString = currentlySelectedListItem.dataset.metadata;
        if (!metaString) {
            console.error('[Swatch Delete] No metadata found on selected item.');
            return;
        }
        const meta = JSON.parse(metaString);

        if (!meta.colorPalette || !Array.isArray(meta.colorPalette)) {
            console.warn('[Swatch Delete] No valid color palette found in metadata to delete from.');
            return; // Nothing to delete
        }

        // Filter out the color
        const originalLength = meta.colorPalette.length;
        meta.colorPalette = meta.colorPalette.filter(color => color !== hexColorToDelete);
        const newLength = meta.colorPalette.length;

        if (newLength < originalLength) {
            console.log(`[Swatch Delete] Color ${hexColorToDelete} removed from local metadata.`);
            // Update the dataset on the list item
            currentlySelectedListItem.dataset.metadata = JSON.stringify(meta);
            
            // Re-render the palette display
            displayPalette(meta.colorPalette);

            // Save the updated palette to the backend
            savePaletteUpdate(meta);

            // Check if palette became empty, trigger regeneration check for next select?
            // No, showImage logic already handles this on next selection.
        } else {
            console.warn(`[Swatch Delete] Color ${hexColorToDelete} not found in palette.`);
        }

    } catch (error) {
        console.error('[Swatch Delete] Error handling swatch deletion:', error);
        showMessage('Error updating palette.', true);
    }
}

// --- Save Palette Update to Backend ---
async function savePaletteUpdate(meta) {
    // Extract filename using browser-compatible string splitting
    const filename = meta.cachedFilePath ? meta.cachedFilePath.split('/').pop() : null;
    
    if (!filename) {
        console.error('[Save Palette] Cannot determine filename from metadata:', meta);
        showMessage('Error saving palette: Cannot find filename.', true);
        return;
    }
    
    console.log(`[Save Palette] Saving updated palette for ${filename}`); // Template literal OK here

    try {
        const response = await fetch('/api/palette/' + encodeURIComponent(filename), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ colorPalette: meta.colorPalette }) // Send the updated array
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
            console.error(`[Save Palette] Error response from server (${response.status}):`, errorData);
            showMessage(`Error saving palette: ${errorData.message || 'Server error'}`, true);
        } else {
            console.log(`[Save Palette] Successfully saved updated palette for ${filename}.`);
            // Optional: Show temporary success message?
            // showMessage('Palette updated.'); 
        }
    } catch (error) {
        console.error(`[Save Palette] Network or fetch error saving palette for ${filename}:`, error);
        showMessage('Network error saving palette update.', true);
    }
}

// --- Delete Image ---
async function deleteImage(filename, listItem) {
     if (!confirm('Are you sure you want to delete "' + filename + '"?')) {
        return;
    }
    showMessage('Deleting...');
    try {
         const response = await fetch('/api/images/' + encodeURIComponent(filename), {
            method: 'DELETE'
        });
        const result = await response.json();

        if (response.ok && result.success) {
            showMessage('Image deleted successfully.');
            const wasSelected = (listItem === currentlySelectedListItem);
            listItem.remove();
            if (wasSelected) {
                 currentlySelectedListItem = null;
                 imgElement.src = ''; 
                 imgElement.style.display = 'none';
                 placeholder.style.display = 'block';
                 displayMetadata(null); 
                 displayPalette(null); 

                 const firstListItem = fileList.firstChild;
                 if (firstListItem && firstListItem.tagName === 'LI') { 
                    const firstLink = firstListItem.querySelector('a');
                     if (firstLink) {
                        const firstImageUrl = firstLink.href;
                        showImage(firstImageUrl, firstListItem);
                    }
                 } else {
                     imgElement.src = '';
                     imgElement.style.display = 'none';
                     placeholder.style.display = 'block';
                     displayMetadata(null);
                     displayPalette(null); 
                     fileList.innerHTML = '<li>No images stored.</li>';
                 }
            } else {
                if (fileList.children.length === 0) {
                     fileList.innerHTML = '<li>No images stored.</li>';
                     // Ensure viewer is cleared if the list is now empty
                     imgElement.src = '';
                     imgElement.style.display = 'none';
                     placeholder.style.display = 'block';
                     displayMetadata(null);
                     displayPalette(null); 
                }
            }
        } else {
            showMessage(result.message || 'Error deleting image.', true);
        }
    } catch (error) {
        console.error('Deletion failed:', error);
        showMessage('Failed to delete image.', true);
    }
}

// --- Form Submission ---
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage('Processing...');
    console.log('[Form Submit] Submitting form data...');
    const formData = new FormData(form);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
         console.log('[Form Submit] Received response status:', response.status);
        const result = await response.json(); 

        if (response.ok && result.success) {
            showMessage('Success: Image processed.');
            loadImageList(); // Reload list to show the new file
            form.reset();
            toggleInput('url'); 
        } else {
            console.error('[Form Submit] Error response:', result);
            showMessage(result.message || 'An error occurred.', true);
        }
    } catch (error) {
        console.error('[Form Submit] Catch block error:', error);
        showMessage('Submission failed. Check console.', true);
    }
});

// --- Save Palette Name Update to Backend ---
async function savePaletteName(filename, newName) {
    if (!filename) {
        console.error('[Save Name] Cannot save name, filename is missing.');
        return; 
    }
    console.log(`[Save Name] Saving new name "${newName}" for ${filename}`);

    try {
        const response = await fetch('/api/metadata/' + encodeURIComponent(filename), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ paletteName: newName })
        });

        const result = await response.json().catch(() => null); // Attempt to parse JSON, but handle cases where it might not be JSON

        if (!response.ok) {
            console.error(`[Save Name] Error response from server (${response.status}):`, result);
            showMessage(`Error saving name: ${result ? result.message : 'Server error'}`, true);
        } else {
            console.log(`[Save Name] Successfully saved new name for ${filename}.`);
            showMessage('Palette name updated.', false); // Brief success message
            
            // Update local metadata as well for immediate consistency
            if (currentlySelectedListItem) {
                 try {
                    const meta = JSON.parse(currentlySelectedListItem.dataset.metadata);
                    meta.paletteName = newName;
                    currentlySelectedListItem.dataset.metadata = JSON.stringify(meta);

                    // --- Update visible list item text ---
                    const linkElement = currentlySelectedListItem.querySelector('a');
                    if (linkElement) {
                        const dimensions = (meta.width && meta.height) ? ' (' + meta.width + 'x' + meta.height + ') ' : ' ';
                        linkElement.textContent = newName + dimensions;
                        console.log('[Save Name] Updated list item display text.');
                    } else {
                        console.warn('[Save Name] Could not find link element in list item to update text.');
                    }
                    // --- End update visible list item text ---

                 } catch (e) {
                     console.error('[Save Name] Error updating local metadata dataset or list item text:', e);
                 }
            }
        }
    } catch (error) {
        console.error(`[Save Name] Network or fetch error saving name for ${filename}:`, error);
        showMessage('Network error saving palette name.', true);
    }
}

// --- Event Listener for Palette Name Input ---
paletteNameInput.addEventListener('change', (event) => {
    const newName = event.target.value.trim();
    if (!currentlySelectedListItem) {
        console.warn('[Palette Name Change] Ignored: No item selected.');
        return; // No item selected
    }
    if (!newName) {
        showMessage('Palette name cannot be empty.', true);
        // Optionally revert to previous name? For now, just warn.
        return;
    }

    // Get filename from the selected item's metadata
    let filename = null;
    try {
        const meta = JSON.parse(currentlySelectedListItem.dataset.metadata);
        filename = meta.cachedFilePath ? meta.cachedFilePath.split('/').pop() : null;
        // Check if name actually changed
        if (meta.paletteName === newName) {
             console.log('[Palette Name Change] Name unchanged, skipping save.');
             return;
        }
    } catch (e) {
        console.error('[Palette Name Change] Could not get filename from metadata.', e);
        showMessage('Error determining filename to save name.', true);
        return;
    }
    
    if (filename) {
        savePaletteName(filename, newName); // Call function to save via API
    }
});

// --- Export Palette Functionality ---
function handleExportPalette() {
    if (!currentlySelectedListItem) {
        showMessage('Please select an image first.', true);
        return;
    }

    // 1. Get Palette Name
    let paletteName = paletteNameInput.value.trim();
    let defaultFilename = 'palette'; // Fallback filename base

    if (!paletteName) {
        try {
            const metaString = currentlySelectedListItem.dataset.metadata;
            if (metaString) {
                const meta = JSON.parse(metaString);
                if (meta.cachedFilePath) {
                    // Use filename without extension as fallback name
                    const filename = meta.cachedFilePath.split('/').pop();
                    defaultFilename = filename.includes('.') ? filename.substring(0, filename.lastIndexOf('.')) : filename;
                    paletteName = defaultFilename; 
                }
            }
        } catch (e) {
            console.error('[Export] Error getting filename from metadata:', e);
        }
    }
    // If still no name, use the generic fallback
    if (!paletteName) {
        paletteName = defaultFilename;
    }

    // 2. Get Colors from Swatches
    const colorSwatches = paletteDisplayArea.querySelectorAll('.palette-color:not(.test-placeholder-swatch)'); // Exclude placeholder
    const colors = [];
    colorSwatches.forEach(swatch => {
        // Extract hex color from background-color style (e.g., "rgb(0, 0, 0)" or "#ffffff")
        const rgbColor = swatch.style.backgroundColor;
        try {
            // Check if it's already a hex color
            if (rgbColor.startsWith('#')) {
                colors.push(rgbColor);
            } else {
                // Convert rgb(r, g, b) to hex
                const rgbValues = rgbColor.match(/\d+/g);
                if (rgbValues && rgbValues.length === 3) {
                    const r = parseInt(rgbValues[0]).toString(16).padStart(2, '0');
                    const g = parseInt(rgbValues[1]).toString(16).padStart(2, '0');
                    const b = parseInt(rgbValues[2]).toString(16).padStart(2, '0');
                    colors.push(`#${r}${g}${b}`);
                } else {
                    console.warn('[Export] Could not parse RGB color:', rgbColor);
                }
            }
        } catch (e) {
            console.error('[Export] Error processing color swatch:', rgbColor, e);
        }
    });

    if (colors.length === 0) {
        showMessage('No colors in the current palette to export.', true);
        return;
    }

    // 3. Create JSON data
    const jsonData = {
        name: paletteName,
        colors: colors
    };
    const jsonString = JSON.stringify(jsonData, null, 2); // Pretty print JSON

    // 4. Trigger Download
    // Ensure the file ends with a newline character
    const blob = new Blob([jsonString + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    // Sanitize palette name for use in filename
    const downloadFilenameBase = paletteName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '') || defaultFilename;
    link.download = `${downloadFilenameBase}.json`;
    link.href = url;
    link.style.display = 'none'; // Hide the link

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('[Export] Exported palette:', paletteName, colors);
    showMessage(`Export initiated for "${link.download}". Check your browser downloads.`);
}

// Add event listener (ensure button exists first)
if (exportButton) {
    exportButton.addEventListener('click', handleExportPalette);
} else {
    console.error('[Script Init] Export button not found.');
}

// --- Initial Setup & Window Events ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Window loaded. Initializing script.');
    toggleInput('url'); 
    loadImageList(); 
});
