import { useState, useEffect } from "react";
import Head from "next/head";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [analyzingDocumentId, setAnalyzingDocumentId] = useState(null);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Check for token in localStorage
    const token = localStorage.getItem("token");
    if (token) {
      fetchUserData(token);
    }
  }, []);

  const fetchUserData = async (token) => {
    try {
      const response = await fetch("/api/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        fetchDocuments(token);
      } else {
        setError(data.error || "Failed to fetch user data");
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      setError(error.message || "Failed to fetch user data");
    }
  };

  const fetchDocuments = async (token) => {
    try {
      const response = await fetch("/api/documents", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setDocuments(data.documents);
      } else {
        setError(data.error || "Failed to fetch documents");
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      setError(error.message || "Failed to fetch documents");
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/${authMode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        setUser(data.user);
        fetchDocuments(data.token);
      } else {
        setError(
          typeof data.error === "string" ? data.error : "Authentication failed"
        );
      }
    } catch (error) {
      setError(error.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setDocuments([]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a valid document file (TXT, PDF, or DOC/DOCX)");
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setError("File size must be less than 10MB");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to upload documents");
        return;
      }

      // Create FormData for better file handling
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/documents/scan", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUser((prev) => ({
          ...prev,
          credits: data.credits,
        }));
        fetchDocuments(token);
        // Clear the file input
        e.target.value = "";
      } else {
        setError(
          data.details ||
            data.error ||
            "Failed to process document. Please try again."
        );
      }
    } catch (error) {
      console.error("Upload error:", error);
      setError(
        error.message || "Failed to process document. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/documents/${doc._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setSelectedDocument(data.document);
        setShowDocumentModal(true);
      } else {
        setError(data.error || "Failed to fetch document");
      }
    } catch (error) {
      console.error("View document error:", error);
      setError(error.message || "Failed to fetch document");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/documents/${doc._id}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Download failed");
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition
        ? decodeURIComponent(
            contentDisposition.split("filename=")[1].replace(/"/g, "")
          )
        : doc.originalName;

      // Create a blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      setError(error.message || "Failed to download document");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeDocument = async (document) => {
    if (!user || user.credits <= 0) {
      setError("Insufficient credits to analyze documents");
      return;
    }

    if (analyzingDocumentId) {
      setError("Please wait for the current analysis to complete");
      return;
    }

    setAnalyzingDocumentId(document._id);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${document._id}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze document");
      }

      // Update the specific document in the documents array
      setDocuments((prevDocs) =>
        prevDocs.map((doc) => (doc._id === document._id ? data.document : doc))
      );

      // Update the selected document if it's currently being viewed
      if (selectedDocument && selectedDocument._id === document._id) {
        setSelectedDocument(data.document);
      }

      // Update user credits
      setUser((prevUser) => ({
        ...prevUser,
        credits: data.credits,
      }));

      alert("Document analyzed successfully!");
    } catch (error) {
      console.error("Analysis error:", error);
      setError(
        error.message || "Failed to analyze document. Please try again."
      );
    } finally {
      setAnalyzingDocumentId(null);
    }
  };

  const handleDeleteDocument = async (document) => {
    setDocumentToDelete(document);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/documents/${documentToDelete._id}/delete`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete document");
      }

      // Remove the document from the documents array
      setDocuments((prevDocs) =>
        prevDocs.filter((doc) => doc._id !== documentToDelete._id)
      );

      // Close the modal
      setShowDeleteModal(false);
      setDocumentToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
      setError(error.message || "Failed to delete document");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <Head>
        <title>Document Scanner</title>
        <meta name="description" content="AI-powered document scanner" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Document Scanner
            </h1>
            <p className="text-xl text-gray-300">
              AI-powered document analysis and processing
            </p>
          </motion.div>

          {!user ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-800 rounded-lg p-6 shadow-lg"
            >
              <div className="flex justify-center space-x-4 mb-6">
                <button
                  onClick={() => setAuthMode("login")}
                  className={`px-4 py-2 rounded ${
                    authMode === "login"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300"
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setAuthMode("register")}
                  className={`px-4 py-2 rounded ${
                    authMode === "register"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300"
                  }`}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === "register" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-transparent focus:border-blue-500 focus:ring-0"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-transparent focus:border-blue-500 focus:ring-0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-transparent focus:border-blue-500 focus:ring-0"
                    required
                  />
                </div>
                {error && (
                  <div className="text-red-400 text-sm">
                    {typeof error === "string" ? error : "An error occurred"}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  {loading
                    ? "Processing..."
                    : authMode === "login"
                    ? "Login"
                    : "Register"}
                </button>
              </form>
            </motion.div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-gray-800 rounded-lg p-6 shadow-lg mb-8"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-blue-400">
                      Welcome, {user.name}!
                    </h2>
                    <p className="text-gray-400">
                      Credits remaining: {user.credits}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                  >
                    Logout
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Upload a document to scan
                    </label>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".txt,.pdf,.doc,.docx"
                      className="block w-full text-sm text-gray-300
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-600 file:text-white
                        hover:file:bg-blue-700"
                    />
                  </div>
                  {loading && (
                    <div className="text-center text-blue-400">
                      Processing document...
                    </div>
                  )}
                  {error && (
                    <div className="text-red-400 text-sm">
                      {typeof error === "string" ? error : "An error occurred"}
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gray-800 rounded-lg p-6 shadow-lg"
              >
                <h2 className="text-2xl font-semibold mb-4 text-purple-400">
                  Your Documents
                </h2>
                <div className="space-y-4">
                  {documents.length === 0 ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-gray-400"
                    >
                      No documents yet. Upload one to get started!
                    </motion.p>
                  ) : (
                    <AnimatePresence>
                      {documents.map((doc, index) => (
                        <motion.div
                          key={doc._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="bg-gray-700 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <div className="flex flex-col space-y-4">
                            {/* Document Header */}
                            <motion.div
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                              whileHover={{ scale: 1.01 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="flex-1">
                                <h3 className="text-xl font-semibold text-white mb-1">
                                  {doc.originalName}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
                                  <span>
                                    {new Date(
                                      doc.createdAt
                                    ).toLocaleDateString()}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {doc.fileType.split("/")[1].toUpperCase()}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {(doc.fileSize / 1024).toFixed(2)} KB
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 sm:gap-3">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleViewDocument(doc)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex-1 sm:flex-none"
                                >
                                  View
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 flex-1 sm:flex-none"
                                >
                                  Download
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleAnalyzeDocument(doc)}
                                  disabled={
                                    analyzingDocumentId !== null ||
                                    user.credits <= 0
                                  }
                                  className={`px-4 py-2 rounded-lg transition-colors duration-200 flex-1 sm:flex-none ${
                                    analyzingDocumentId !== null ||
                                    user.credits <= 0
                                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                      : "bg-purple-600 hover:bg-purple-700 text-white"
                                  }`}
                                >
                                  {analyzingDocumentId === doc._id ? (
                                    <motion.span
                                      className="flex items-center justify-center"
                                      animate={{ rotate: 360 }}
                                      transition={{
                                        duration: 1,
                                        repeat: Infinity,
                                        ease: "linear",
                                      }}
                                    >
                                      <svg
                                        className="h-4 w-4 text-white mr-2"
                                        viewBox="0 0 24 24"
                                      >
                                        <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                          fill="none"
                                        />
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                      </svg>
                                      Analyzing...
                                    </motion.span>
                                  ) : (
                                    "AI Analysis"
                                  )}
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleDeleteDocument(doc)}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 flex-1 sm:flex-none"
                                >
                                  Delete
                                </motion.button>
                              </div>
                            </motion.div>

                            {/* Analysis Results */}
                            <AnimatePresence>
                              {doc.analysis && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="mt-4 bg-gray-800 rounded-lg p-4 border border-gray-600"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                    <h4 className="text-lg font-semibold text-purple-400">
                                      Document Analysis
                                    </h4>
                                    <span className="text-sm text-gray-400">
                                      Last analyzed:{" "}
                                      {new Date(doc.updatedAt).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="space-y-4">
                                    {doc.analysis
                                      .split("\n\n")
                                      .map((section, sectionIndex) => (
                                        <motion.div
                                          key={sectionIndex}
                                          initial={{ opacity: 0, x: -20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{
                                            delay: sectionIndex * 0.1,
                                          }}
                                          className="bg-gray-700 rounded-lg p-3"
                                        >
                                          <h5 className="text-md font-semibold text-purple-300 mb-2">
                                            {section.split("\n")[0]}
                                          </h5>
                                          <div className="text-gray-300 text-sm whitespace-pre-line">
                                            {section
                                              .split("\n")
                                              .slice(1)
                                              .join("\n")}
                                          </div>
                                        </motion.div>
                                      ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </div>
      </main>

      {/* Document Modal */}
      <AnimatePresence>
        {showDocumentModal && selectedDocument && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedDocument.originalName}
                </h2>
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Document Content */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">
                    Document Content
                  </h3>
                  {selectedDocument.fileType === "application/pdf" ? (
                    <div className="aspect-w-16 aspect-h-9">
                      <iframe
                        src={`data:application/pdf;base64,${selectedDocument.processedText}`}
                        className="w-full h-[500px]"
                        title="PDF Preview"
                      />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-gray-700">
                      {Buffer.from(
                        selectedDocument.processedText,
                        "base64"
                      ).toString()}
                    </div>
                  )}
                </div>

                {/* AI Analysis Section */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-blue-800">
                      AI Analysis
                    </h3>
                    <button
                      onClick={() => handleAnalyzeDocument(selectedDocument)}
                      disabled={
                        analyzingDocumentId !== null || user.credits <= 0
                      }
                      className={`px-4 py-2 rounded text-sm font-medium ${
                        analyzingDocumentId !== null || user.credits <= 0
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {analyzingDocumentId === selectedDocument._id ? (
                        <span className="flex items-center justify-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Analyzing...
                        </span>
                      ) : (
                        "Re-analyze"
                      )}
                    </button>
                  </div>
                  {selectedDocument.analysis ? (
                    <div className="text-gray-700 whitespace-pre-wrap">
                      {selectedDocument.analysis}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">
                      No analysis available yet. Click the "Re-analyze" button
                      to generate an analysis.
                    </p>
                  )}
                  {user.credits <= 0 && (
                    <p className="text-red-500 text-sm mt-2">
                      You need credits to perform analysis. Please purchase more
                      credits.
                    </p>
                  )}
                </div>

                {/* Document Details */}
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-semibold">Views:</span>{" "}
                    {selectedDocument.views || 0}
                  </div>
                  <div>
                    <span className="font-semibold">Downloads:</span>{" "}
                    {selectedDocument.downloads || 0}
                  </div>
                  <div>
                    <span className="font-semibold">File Type:</span>{" "}
                    {selectedDocument.fileType}
                  </div>
                  <div>
                    <span className="font-semibold">Size:</span>{" "}
                    {(selectedDocument.fileSize / 1024).toFixed(2)} KB
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && documentToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-800 rounded-lg p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-semibold text-white mb-4">
                Delete Document
              </h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete "{documentToDelete.originalName}
                "? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDocumentToDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
                  disabled={deleting}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
                  disabled={deleting}
                >
                  {deleting ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Deleting...
                    </span>
                  ) : (
                    "Delete"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-16 text-center text-gray-400 py-8">
        <p>© 2024 Document Scanner. All rights reserved.</p>
      </footer>
    </div>
  );
}
