"use client";

import { useState } from "react";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setMessage({ type: "", text: "" });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({ type: "error", text: "Please select a file first" });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setMessage({ type: "", text: "" });

    try {
      // Step 1: Get pre-signed URL from our API
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get upload URL");
      }

      const { presignedUrl, key } = await response.json();

      // Step 2: Upload file directly to S3 using the pre-signed URL
      // Note: Headers must match exactly what was used to generate the pre-signed URL
      const uploadHeaders = {};
      if (selectedFile.type) {
        uploadHeaders["Content-Type"] = selectedFile.type;
      }

      const uploadResponse = await fetch(presignedUrl, {
        method: "PUT",
        body: selectedFile,
        headers: uploadHeaders,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(
          `Failed to upload file to S3: ${uploadResponse.status} ${uploadResponse.statusText}. ${errorText}`
        );
      }

      // Success!
      setMessage({
        type: "success",
        text: `File "${selectedFile.name}" uploaded successfully!`,
      });
      setUploadedFiles((prev) => [
        ...prev,
        { name: selectedFile.name, key, uploadedAt: new Date() },
      ]);
      setSelectedFile(null);
      setUploadProgress(100);

      // Reset file input
      const fileInput = document.getElementById("file-input");
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Upload error:", error);
      let errorMessage = error.message || "Failed to upload file";

      // Provide more helpful error messages
      if (error.message.includes("Failed to fetch")) {
        errorMessage =
          "Network error: This is likely a CORS issue. Please ensure your S3 bucket has CORS configured to allow requests from this origin.";
      }

      setMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1
        style={{ marginBottom: "2rem", fontSize: "2rem", fontWeight: "bold" }}
      >
        S3 File Uploader
      </h1>

      <div
        style={{
          border: "2px dashed #ccc",
          borderRadius: "8px",
          padding: "2rem",
          textAlign: "center",
          marginBottom: "2rem",
          backgroundColor: "#f9fafb",
        }}
      >
        <input
          id="file-input"
          type="file"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ marginBottom: "1rem" }}
        />

        {selectedFile && (
          <div style={{ marginBottom: "1rem", color: "#666" }}>
            <strong>Selected:</strong> {selectedFile.name} (
            {(selectedFile.size / 1024).toFixed(2)} KB)
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          style={{
            padding: "0.75rem 2rem",
            fontSize: "1rem",
            backgroundColor: uploading ? "#ccc" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: uploading ? "not-allowed" : "pointer",
            fontWeight: "600",
          }}
        >
          {uploading ? "Uploading..." : "Upload to S3"}
        </button>

        {uploading && uploadProgress > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: "#e0e0e0",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: "100%",
                  backgroundColor: "#0070f3",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}

        {message.text && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              borderRadius: "6px",
              backgroundColor:
                message.type === "success" ? "#d4edda" : "#f8d7da",
              color: message.type === "success" ? "#155724" : "#721c24",
            }}
          >
            {message.text}
          </div>
        )}
      </div>

      {uploadedFiles.length > 0 && (
        <div>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
            Uploaded Files
          </h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {uploadedFiles.map((file, index) => (
              <li
                key={index}
                style={{
                  padding: "1rem",
                  marginBottom: "0.5rem",
                  backgroundColor: "#f9fafb",
                  borderRadius: "6px",
                  border: "1px solid #e0e0e0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: "500" }}>{file.name}</span>
                  <span style={{ fontSize: "0.875rem", color: "#666" }}>
                    {file.uploadedAt.toLocaleTimeString()}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#999",
                    marginTop: "0.25rem",
                  }}
                >
                  {file.key}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
