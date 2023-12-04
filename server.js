const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Configure Multer to handle file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Configure Google Cloud Storage
const storageClient = new Storage({
  keyFilename: 'gcauth.json', // Replace with your Google Cloud Storage key file
  projectId: 'directed-line-406208', // Replace with your Google Cloud project ID
});
const bucket = storageClient.bucket('candidatefilemk'); // Replace with your Google Cloud Storage bucket name
// Serve static files from the 'public' directory
app.use('/styles', express.static(path.join(__dirname, 'asset', 'css')));
app.use('/scripts', express.static(path.join(__dirname, 'asset', 'js')));
app.use('/image', express.static(path.join(__dirname, 'asset', 'image')));

app.use(express.static(path.join(__dirname, 'asset')));
// Serve HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  // Determine the file extension
  const fileExtension = path.extname(file.originalname);

  if (fileExtension !== '.pdf' && fileExtension !== '.docx') {
    return res.status(400).send('Unsupported file format. Please upload a PDF or Word file.');
  }
  if (file.size > 5 * 1024 * 1024) {
    return res.status(400).send('File size exceeds the limit of 5MB.');
  }
  const fileName = `${Date.now()}_${file.originalname}`;

  // Create a stream to upload the file to Google Cloud Storage
  const fileStream = bucket.file(fileName).createWriteStream({
    metadata: {
      contentType: file.mimetype,
    },
  });

  fileStream.on('error', (err) => {
    console.error(err);
    res.status(500).send('Error uploading file to Google Cloud Storage.');
  });

  fileStream.on('finish', () => {
    const fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    res.send(fileUrl);
  });

  fileStream.end(file.buffer);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
