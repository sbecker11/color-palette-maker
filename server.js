const express = require('express');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const fsp = require('fs').promises;
const net = require('net');
const multer = require('multer');
const sharp = require('sharp');

// Import modularized handlers
const metadataHandler = require('./metadata_handler');
const imageProcessor = require('./image_processor');

const app = express();
const port = 3000;

// --- Configuration ---
const uploadsDir = path.join(__dirname, 'uploads');

// Ensure uploads directory exists (using async fs)
async function ensureUploadsDir() {
    try {
        await fsp.mkdir(uploadsDir, { recursive: true });
        console.log(`Uploads directory ensured at: ${uploadsDir}`);
    } catch (error) {
        console.error("Error ensuring uploads directory exists:", error);
        process.exit(1); // Exit if we can't create the uploads dir
    }
}

// --- Multer Setup (Memory Storage) ---
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// --- Middleware ---
// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(uploadsDir));
// Serve static files from the React build (client/dist) or fallback to frontend for backwards compat
const frontendDir = path.join(__dirname, 'client', 'dist');
const legacyFrontendDir = path.join(__dirname, 'frontend');
app.use(express.static(fs.existsSync(frontendDir) ? frontendDir : legacyFrontendDir));

// --- API Routes ---

// GET /api/images - List images from metadata
app.get('/api/images', async (req, res) => {
    console.log('[API GET /images] Request received.');
    try {
        const metadata = await metadataHandler.readMetadata();
        res.json({ success: true, images: metadata.reverse() }); // Newest first
    } catch (error) {
        console.error('[API GET /images] Error:', error);
        res.status(500).json({ success: false, message: "Error reading image metadata." });
    }
});

// POST /upload - Handle image upload/download
app.post('/upload', upload.single('imageFile'), async (req, res) => {
    console.log('[API POST /upload] Request received.');
    const uploadType = req.body.uploadType;
    const imageUrl = req.body.imageUrl;
    let inputBuffer = null;
    let sourceInfo = {}; 

    try {
        // 1. Get Input Buffer (File or URL)
        if (req.file) {
            console.log(`[Upload] Processing uploaded file: ${req.file.originalname}`);
            inputBuffer = req.file.buffer;
            sourceInfo.uploadedFilePath = req.file.originalname;
        } else if (uploadType === 'url' && imageUrl) {
            console.log(`[Upload] Attempting to download from URL: ${imageUrl}`);
            const response = await axios({
                method: 'get', url: imageUrl, responseType: 'arraybuffer',
                timeout: 15000
            });
            const contentType = response.headers['content-type'];
            if (!contentType || !contentType.startsWith('image/')) {
                 throw new Error(`Invalid content type (${contentType || 'unknown'}) at URL.`);
            }
            inputBuffer = Buffer.from(response.data);
            sourceInfo.uploadedURL = imageUrl;
            console.log(`[Upload] Downloaded ${inputBuffer.length} bytes from URL.`);
        } else {
            let message = 'Invalid input: No file or URL provided.';
            if (uploadType === 'url' && !imageUrl) message = 'Image URL is required.';
            else if (uploadType === 'file' && !req.file) message = 'Please select a file.';
            return res.status(400).json({ success: false, message: message });
        }

        if (!inputBuffer || inputBuffer.length === 0) {
            throw new Error("Input buffer is empty.");
        }

        // 2. Process with Sharp (get metadata, save file)
        const image = sharp(inputBuffer);
        const metadata = await image.metadata();
        const supportedFormats = ['jpeg', 'png', 'webp', 'gif', 'tiff', 'avif'];
        const outputFormat = supportedFormats.includes(metadata.format) ? metadata.format : 'jpeg';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const outputFilename = `img-${uniqueSuffix}.${outputFormat}`;
        const outputFilePath = path.join(uploadsDir, outputFilename);
        const outputInfo = await image.toFile(outputFilePath);
        console.log(`[Upload] Saved processed image to: ${outputFilePath}`);

        // 3. Create Metadata Record
        const defaultPaletteName = path.parse(outputFilename).name; // Filename without extension
        const record = {
            createdDateTime: new Date().toISOString(),
            uploadedURL: sourceInfo.uploadedURL || null,
            uploadedFilePath: sourceInfo.uploadedFilePath || null,
            cachedFilePath: outputFilePath,
            width: metadata.width,
            height: metadata.height,
            format: outputFormat,
            fileSizeBytes: outputInfo.size,
            colorPalette: [], // Initialize empty
            paletteName: defaultPaletteName // Add default palette name
        };

        // 4. Append Metadata
        await metadataHandler.appendMetadata(record);

        // 5. Return Success
        res.json({ success: true, filename: outputFilename, metadata: record });

    } catch (error) {
        console.error('[API POST /upload] Error:', error);
        let userMessage = 'Failed to process image.';
        // ... (keep existing specific error message handling)
        if (error.response) { userMessage = `Download failed. Status: ${error.response.status}`; }
        else if (error.request) { userMessage = 'Download failed. No response from URL.'; }
        else if (error.code === 'ERR_INVALID_URL') { userMessage = 'Invalid URL.'; }
        else if (error.message.includes('Input buffer contains unsupported image format')) { userMessage = 'Unsupported image format.'; }
        else if (error.message.includes('timeout')) { userMessage = 'Download/processing timed out.'; }
        else if (error.message.includes('File size limit exceeded')) { userMessage = 'Uploaded file is too large.'; }
        else { userMessage = error.message || 'An unknown error occurred.'; }
        res.status(500).json({ success: false, message: userMessage });
    }
});

// POST /api/palette/:filename - Generate Palette On-Demand
app.post('/api/palette/:filename', async (req, res) => {
    const filename = req.params.filename;
    console.log(`[API POST /palette] Request received for filename: ${filename}`);

    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ success: false, message: 'Invalid filename.' });
    }

    let allMetadata;
    try {
        allMetadata = await metadataHandler.readMetadata();
    } catch (readError) {
        console.error("[API POST /palette] Error reading metadata:", readError);
        return res.status(500).json({ success: false, message: 'Failed to read image metadata.' });
    }

    const imageIndex = allMetadata.findIndex(entry => path.basename(entry.cachedFilePath || '') === filename);

    if (imageIndex === -1) {
        return res.status(404).json({ success: false, message: 'Image metadata not found.' });
    }

    const imageMeta = allMetadata[imageIndex];

    // Log the state before the check
    console.log(`[API POST /palette] Checking existing palette for ${filename}. Found:`, JSON.stringify(imageMeta.colorPalette));

    // Check if palette already exists and is valid
    if (imageMeta.colorPalette && Array.isArray(imageMeta.colorPalette) && imageMeta.colorPalette.length > 0) {
        console.log(`[API POST /palette] Returning cached palette for ${filename}.`);
        return res.json({ success: true, palette: imageMeta.colorPalette });
    }

    console.log(`[API POST /palette] Generating new palette for ${filename}`);
    const imagePath = path.join(uploadsDir, filename); // Use constructed path

    try {
        // Generate palette using the imported function
        const extractedPalette = await imageProcessor.generateDistinctPalette(imagePath);

        // Update metadata array
        allMetadata[imageIndex].colorPalette = extractedPalette;

        // Rewrite metadata file
        await metadataHandler.rewriteMetadata(allMetadata);
        console.log(`[API POST /palette] Rewritten metadata for ${filename} with new palette.`);

        // Return new palette
        res.json({ success: true, palette: extractedPalette });

    } catch (error) {
        // Catch errors specifically from palette generation or rewrite
        console.error(`[API POST /palette] Error generating palette or rewriting metadata for ${filename}:`, error);
        res.status(500).json({ success: false, message: 'Error processing image for palette generation.' });
    }
});

// PUT /api/palette/:filename - Update/Save a specific palette
app.put('/api/palette/:filename', express.json(), async (req, res) => { // Use express.json() middleware for this route
    const filename = req.params.filename;
    const updatedPalette = req.body.colorPalette;
    console.log(`[API PUT /palette] Request received for ${filename}`);

    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ success: false, message: 'Invalid filename.' });
    }
    // Basic validation for the received palette
    if (!updatedPalette || !Array.isArray(updatedPalette) || !updatedPalette.every(c => /^#[0-9A-F]{6}$/i.test(c))) {
         return res.status(400).json({ success: false, message: 'Invalid palette data format.'});
    }

    let allMetadata;
    try {
        allMetadata = await metadataHandler.readMetadata();
    } catch (readError) {
        console.error("[API PUT /palette] Error reading metadata:", readError);
        return res.status(500).json({ success: false, message: 'Failed to read image metadata.' });
    }

    const imageIndex = allMetadata.findIndex(entry => path.basename(entry.cachedFilePath || '') === filename);

    if (imageIndex === -1) {
        return res.status(404).json({ success: false, message: 'Image metadata not found.' });
    }

    console.log(`[API PUT /palette] Updating palette for ${filename} with ${updatedPalette.length} colors.`);
    // Update the palette in the metadata array
    allMetadata[imageIndex].colorPalette = updatedPalette;

    // Rewrite the metadata file
    try {
        await metadataHandler.rewriteMetadata(allMetadata);
        console.log(`[API PUT /palette] Successfully saved updated palette for ${filename}.`);
        res.json({ success: true, message: 'Palette updated successfully.' });
    } catch (writeError) {
        console.error(`[API PUT /palette] Error rewriting metadata for ${filename}:`, writeError);
        res.status(500).json({ success: false, message: 'Failed to save updated palette.' });
    }
});

// PUT /api/metadata/:filename - Update specific metadata fields (e.g., paletteName)
app.put('/api/metadata/:filename', express.json(), async (req, res) => {
    const filename = req.params.filename;
    const { paletteName } = req.body; // Expecting { paletteName: "new name" }
    console.log(`[API PUT /metadata] Request received for ${filename}`);

    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ success: false, message: 'Invalid filename.' });
    }
    // Validate the new name (basic check)
    if (typeof paletteName !== 'string' || paletteName.trim().length === 0 || paletteName.length > 100) {
        return res.status(400).json({ success: false, message: 'Invalid palette name provided.' });
    }

    let allMetadata;
    try {
        allMetadata = await metadataHandler.readMetadata();
    } catch (readError) {
        console.error("[API PUT /metadata] Error reading metadata:", readError);
        return res.status(500).json({ success: false, message: 'Failed to read image metadata.' });
    }

    const imageIndex = allMetadata.findIndex(entry => path.basename(entry.cachedFilePath || '') === filename);

    if (imageIndex === -1) {
        return res.status(404).json({ success: false, message: 'Image metadata not found.' });
    }

    console.log(`[API PUT /metadata] Updating paletteName for ${filename} to "${paletteName}".`);
    // Update the specific field
    allMetadata[imageIndex].paletteName = paletteName.trim(); // Trim whitespace

    // Rewrite the metadata file
    try {
        await metadataHandler.rewriteMetadata(allMetadata);
        console.log(`[API PUT /metadata] Successfully saved updated metadata for ${filename}.`);
        res.json({ success: true, message: 'Metadata updated successfully.' });
    } catch (writeError) {
        console.error(`[API PUT /metadata] Error rewriting metadata for ${filename}:`, writeError);
        res.status(500).json({ success: false, message: 'Failed to save updated metadata.' });
    }
});

// PUT /api/images/order - Reorder images in the Library
app.put('/api/images/order', express.json(), async (req, res) => {
    const { filenames } = req.body;
    console.log('[API PUT /images/order] Request received.');

    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid filenames array.' });
    }

    // Validate each filename
    for (const fn of filenames) {
        if (typeof fn !== 'string' || fn.includes('..') || fn.includes('/') || fn.includes('\\')) {
            return res.status(400).json({ success: false, message: 'Invalid filename in order list.' });
        }
    }

    let allMetadata;
    try {
        allMetadata = await metadataHandler.readMetadata();
    } catch (readError) {
        return res.status(500).json({ success: false, message: 'Failed to read metadata.' });
    }

    const metaByFilename = new Map();
    for (const entry of allMetadata) {
        const fn = path.basename(entry.cachedFilePath || '');
        if (fn) metaByFilename.set(fn, entry);
    }

    // Build new order: display order is [top...bottom], file stores [bottom...top] for reverse() compatibility
    const displayOrder = filenames.filter(fn => metaByFilename.has(fn));
    const fileOrder = displayOrder.slice().reverse();
    const reorderedMetadata = fileOrder.map(fn => metaByFilename.get(fn)).filter(Boolean);

    // Include any metadata not in the request (e.g. race condition) at the end
    const orderedFilenames = new Set(displayOrder);
    for (const entry of allMetadata) {
        const fn = path.basename(entry.cachedFilePath || '');
        if (fn && !orderedFilenames.has(fn)) {
            reorderedMetadata.push(entry);
        }
    }

    try {
        await metadataHandler.rewriteMetadata(reorderedMetadata);
        console.log(`[API PUT /images/order] Successfully reordered ${reorderedMetadata.length} images.`);
        res.json({ success: true, message: 'Order updated successfully.' });
    } catch (writeError) {
        console.error('[API PUT /images/order] Error rewriting metadata:', writeError);
        res.status(500).json({ success: false, message: 'Failed to save new order.' });
    }
});

// DELETE /api/images/:filename - Delete image and metadata
app.delete('/api/images/:filename', async (req, res) => {
    const filenameToDelete = req.params.filename;
    console.log(`[API DELETE /images] Request received for filename: ${filenameToDelete}`);

    if (!filenameToDelete || filenameToDelete.includes('..') || filenameToDelete.includes('/') || filenameToDelete.includes('\\')) {
        return res.status(400).json({ success: false, message: 'Invalid filename.' });
    }

    let allMetadata;
    try {
        allMetadata = await metadataHandler.readMetadata();
    } catch (readError) {
        return res.status(500).json({ success: false, message: 'Failed to read metadata.' });
    }

    let foundEntry = null;
    let foundIndex = -1;
    const filteredMetadata = allMetadata.filter((entry, index) => {
        const entryFilename = path.basename(entry.cachedFilePath || '');
        if (entryFilename === filenameToDelete) {
            foundEntry = entry;
            foundIndex = index;
            return false; // Exclude from filtered list
        }
        return true;
    });

    if (foundIndex === -1) {
        return res.status(404).json({ success: false, message: 'Image metadata not found.' });
    }

    try {
        // 1. Delete the actual image file
        const filePathToDelete = path.join(uploadsDir, filenameToDelete); // Construct path
        console.log(`[API DELETE /images] Deleting image file: ${filePathToDelete}`);
        try {
             await fsp.unlink(filePathToDelete);
             console.log(`[API DELETE /images] Successfully deleted file: ${filePathToDelete}`);
        } catch (unlinkError) {
             if (unlinkError.code === 'ENOENT') {
                 console.warn(`[API DELETE /images] File not found during delete, proceeding to remove metadata: ${filePathToDelete}`);
             } else {
                 throw unlinkError; // Re-throw other unlink errors
             }
        }
       
        // 2. Rewrite the metadata file without the deleted entry
        await metadataHandler.rewriteMetadata(filteredMetadata);

        res.json({ success: true, message: 'Image deleted successfully.' });

    } catch (error) {
        console.error(`[API DELETE /images] Error during deletion process for ${filenameToDelete}:`, error);
        res.status(500).json({ success: false, message: 'Failed to delete image file or update metadata.' });
    }
});

// --- Root Route to serve frontend ---
app.get('/', (req, res) => {
    const indexPath = path.join(frontendDir, 'index.html');
    const legacyPath = path.join(legacyFrontendDir, 'index.html');
    const htmlPath = fs.existsSync(indexPath) ? indexPath : legacyPath;
    res.sendFile(htmlPath);
});

// --- Server Start Logic with Port Check ---
const startApp = () => {
    ensureUploadsDir().then(() => {
        const expressServer = app.listen(port, () => {
            console.log(`Server is running on port ${port}. Access it at http://localhost:${port}`);
        });

        expressServer.on('error', (err) => {
             if (err.code === 'EADDRINUSE') {
                console.error(`\n*** ERROR: Port ${port} is already in use. ***\n`);
                console.error('Please stop the other process or use a different port.');
                process.exit(1);
            } else {
                console.error('An unexpected error occurred with the Express server:', err);
                process.exit(1);
            }
        });

    }).catch(err => {
        console.error("Failed to initialize application directory:", err);
        process.exit(1);
    });
};

// Initial Port Check
const portCheckServer = net.createServer();
portCheckServer.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n*** ERROR: Port ${port} is already in use. ***\n`);
        console.error('Another process is likely listening on this port.');
        console.error('To find and stop the process, you can try running:');
        if (process.platform === 'win32') {
             console.error(`  tasklist | findstr "LISTENING" | findstr ":${port}"  (then use taskkill /PID <pid> /F)`);
        } else {
             console.error(`  sudo lsof -i :${port} -t | xargs kill -9`);
             console.error('(Or use: sudo lsof -i :${port} and kill -9 <PID>)');
        }
        process.exit(1);
    } else {
        console.error(`An unexpected error occurred while checking port ${port}:`, err);
        process.exit(1);
    }
});
portCheckServer.once('listening', () => {
    portCheckServer.close(() => {
        console.log(`Port ${port} is free. Starting the application...`);
        startApp();
    });
});
portCheckServer.listen(port, '127.0.0.1');
