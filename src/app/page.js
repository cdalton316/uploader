"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [watermarkedImages, setWatermarkedImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Fetch watermarked images on component mount and after upload
  useEffect(() => {
    fetchWatermarkedImages();
  }, []);

  const fetchWatermarkedImages = async () => {
    setLoadingImages(true);
    try {
      const response = await fetch("/api/images");
      if (!response.ok) {
        throw new Error("Failed to fetch images");
      }
      const data = await response.json();
      setWatermarkedImages(data.images || []);
    } catch (error) {
      console.error("Error fetching images:", error);
      setMessage({
        type: "error",
        text: "Failed to load watermarked images",
      });
    } finally {
      setLoadingImages(false);
    }
  };

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
        text: `File "${selectedFile.name}" uploaded successfully! Processing watermark...`,
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

      // Refresh watermarked images after a delay (to allow Lambda to process)
      setTimeout(() => {
        fetchWatermarkedImages();
      }, 3000);
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
        <div style={{ marginBottom: "2rem" }}>
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

      {/* Watermarked Images Gallery */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", margin: 0 }}>Watermarked Images</h2>
          <button
            onClick={fetchWatermarkedImages}
            disabled={loadingImages}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loadingImages ? "not-allowed" : "pointer",
              opacity: loadingImages ? 0.6 : 1,
            }}
          >
            {loadingImages ? "Loading..." : "Refresh"}
          </button>
        </div>

        {loadingImages && watermarkedImages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
            Loading images...
          </div>
        ) : watermarkedImages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
            No watermarked images found. Upload an image to see it here!
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            {watermarkedImages.map((image, index) => (
              <div
                key={index}
                onClick={() => setSelectedImage(image)}
                style={{
                  position: "relative",
                  cursor: "pointer",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1px solid #e0e0e0",
                  backgroundColor: "#f9fafb",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <img
                  src={image.url}
                  alt={image.name}
                  style={{
                    width: "100%",
                    height: "200px",
                    objectFit: "cover",
                    display: "block",
                  }}
                  loading="lazy"
                />
                <div
                  style={{
                    padding: "0.75rem",
                    fontSize: "0.875rem",
                    color: "#333",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "500",
                      marginBottom: "0.25rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {image.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#666" }}>
                    {(image.size / 1024).toFixed(2)} KB
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "2rem",
            cursor: "pointer",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              position: "relative",
            }}
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.name}
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />
            <button
              onClick={() => setSelectedImage(null)}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                border: "none",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                fontSize: "1.5rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>
            <div
              style={{
                position: "absolute",
                bottom: "1rem",
                left: "1rem",
                right: "1rem",
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                color: "white",
                padding: "1rem",
                borderRadius: "8px",
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
                {selectedImage.name}
              </div>
              <div style={{ fontSize: "0.875rem" }}>
                Size: {(selectedImage.size / 1024).toFixed(2)} KB
              </div>
              <div style={{ fontSize: "0.875rem" }}>
                Uploaded:{" "}
                {new Date(selectedImage.lastModified).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
