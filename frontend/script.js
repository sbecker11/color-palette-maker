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
let currentlySelectedListItem = null; // Track selected LI
let isSamplingMode = false; // Restore state variable
let currentSampledColor = null; // Restore state variable
let addSwatchElement = null; // Restore state variable

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
    console.log('[Image Select] Showing image:', imageUrl);
    if (event) {
        event.preventDefault();
    }
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
                a.textContent = filename + (meta.width && meta.height ? ' (' + meta.width + 'x' + meta.height + ') ' : ' ');
                a.title = 'Format: ' + (meta.format || '?') + ', Size: ' + (meta.fileSizeBytes ? Math.round(meta.fileSizeBytes / 1024) + ' KB' : '?') + ', Added: ' + (meta.createdDateTime ? new Date(meta.createdDateTime).toLocaleString() : '?');
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
            '<h3>Selected Image Info</h3>' +
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
            '<h3>Selected Image Info</h3>' +
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
        palette.forEach(hexColor => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'palette-item';

            const colorCircle = document.createElement('div');
            colorCircle.className = 'palette-color';
            colorCircle.style.backgroundColor = hexColor;
            colorCircle.title = hexColor;

            const colorLabel = document.createElement('span');
            colorLabel.className = 'palette-label';
            colorLabel.textContent = hexColor;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'swatch-delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.title = 'Delete swatch';
            deleteBtn.onclick = (event) => {
                event.stopPropagation();
                handleSwatchDelete(hexColor);
            };

            itemDiv.appendChild(colorCircle);
            itemDiv.appendChild(colorLabel);
            itemDiv.appendChild(deleteBtn);
            paletteDisplayArea.appendChild(itemDiv);
        });
    }

    // <<<< START TEST CODE: Add placeholder swatch >>>>
    // Ensure this block is active
    const testHexColor = '#888888'; // Keep value for potential title/debug
    console.log(`[Test] Adding placeholder swatch.`);
    const testItemDiv = document.createElement('div');
    testItemDiv.className = 'palette-item';

    const testColorCircle = document.createElement('div');
    testColorCircle.className = 'palette-color test-placeholder-swatch'; // Add specific class
    testColorCircle.style.backgroundColor = 'transparent'; // Make background transparent
    testColorCircle.title = 'Test Placeholder';

    const testColorLabel = document.createElement('span');
    testColorLabel.className = 'palette-label test-placeholder-label'; // Add specific class
    testColorLabel.textContent = testHexColor; // Restore hex text content

    // Remove or hide the delete button for this placeholder
    /* 
    const testDeleteBtn = document.createElement('button');
    testDeleteBtn.className = 'swatch-delete-btn';
    testDeleteBtn.textContent = '×';
    testDeleteBtn.title = 'Delete swatch (test)';
    testDeleteBtn.style.pointerEvents = 'none';
    testItemDiv.appendChild(testDeleteBtn);
    */

    testItemDiv.appendChild(testColorCircle);
    testItemDiv.appendChild(testColorLabel);
    paletteDisplayArea.appendChild(testItemDiv);
    // <<<< END TEST CODE >>>>

    // Handle placeholder message if palette is empty AND not generating
    if (!isGenerating && (!palette || !Array.isArray(palette) || palette.length === 0)) {
         const placeholderSpan = document.createElement('span');
         placeholderSpan.className = 'placeholder';
         placeholderSpan.textContent = 'No color palette extracted for this image.';
         paletteDisplayArea.appendChild(placeholderSpan);
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
                 } catch (e) {
                     console.error('[Save Name] Error updating local metadata dataset:', e);
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

// --- Initial Setup & Window Events ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Window loaded. Initializing script.');
    toggleInput('url'); 
    loadImageList(); 
});
