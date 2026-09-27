import { useEffect, useState } from "react";
import {
  FileText,
  Upload,
  Search,
  Download,
  Trash2,
  File,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  X,
} from "lucide-react";

import Navbar from "../../components/layout/Navbar";
import Sidebar from "../../components/layout/Sidebar";

import "./Documents.css";
import { API_URL } from "../../lib/api";

/* =====================================================
   TYPES
===================================================== */

interface DocumentItem {
  id: number;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  filePath: string;
}


/* =====================================================
   API
===================================================== */

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};


/* =====================================================
   DOCUMENTS PAGE
===================================================== */

function Documents() {

  const [documents, setDocuments] =
    useState<DocumentItem[]>([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);


  /* =====================================================
     FILE ICON
  ===================================================== */

  const getFileIcon = (
    fileName: string
  ) => {

    const extension =
      fileName
        .split(".")
        .pop()
        ?.toLowerCase();


    if (
      extension === "xlsx" ||
      extension === "xls" ||
      extension === "csv"
    ) {
      return (
        <FileSpreadsheet size={22} />
      );
    }


    if (
      extension === "png" ||
      extension === "jpg" ||
      extension === "jpeg" ||
      extension === "gif" ||
      extension === "webp"
    ) {
      return (
        <FileImage size={22} />
      );
    }


    if (
      extension === "zip" ||
      extension === "rar" ||
      extension === "7z"
    ) {
      return (
        <FileArchive size={22} />
      );
    }


    if (
      extension === "pdf"
    ) {
      return (
        <FileText size={22} />
      );
    }


    return (
      <File size={22} />
    );
  };


  /* =====================================================
     FILE SIZE
  ===================================================== */

  const formatFileSize = (
    bytes: number
  ) => {

    if (!bytes || bytes <= 0) {
      return "0 Bytes";
    }


    const sizes = [
      "Bytes",
      "KB",
      "MB",
      "GB",
    ];


    const i = Math.floor(
      Math.log(bytes) /
        Math.log(1024)
    );


    return (
      Math.round(
        (bytes /
          Math.pow(1024, i)) *
          100
      ) /
        100 +
      " " +
      sizes[i]
    );
  };


  /* =====================================================
     DATABASE FILE SIZE
  ===================================================== */

  const formatDatabaseSize = (
    size: number
  ) => {

    if (!size) {
      return "0 Bytes";
    }

    return formatFileSize(size);
  };


  /* =====================================================
     DATABASE DATE
  ===================================================== */

  const formatUploadDate = (
    dateValue: string
  ) => {

    if (!dateValue) {
      return "";
    }


    const date =
      new Date(dateValue);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(dateValue);
    }


    return date.toLocaleDateString(
      "en-IN"
    );
  };


  /* =====================================================
     LOAD DOCUMENTS
  ===================================================== */

  const fetchDocuments =
    async () => {

      try {

        setLoading(true);


        const response =
          await fetch(
            `${API_URL}/documents`,
            { headers: authHeaders() }
          );


        if (!response.ok) {

          throw new Error(
            "Failed to fetch documents"
          );

        }


        const data =
          await response.json();


        if (!Array.isArray(data)) {

          throw new Error(
            "Invalid documents response"
          );

        }


        const formattedDocuments:
          DocumentItem[] =
          data.map(
            (document: any) => {

              const fileName =
                String(
                  document.name ||
                  document.file_name ||
                  "Untitled"
                );


              return {

                id:
                  Number(
                    document.id
                  ),

                name:
                  fileName,

                type:
                  fileName
                    .split(".")
                    .pop()
                    ?.toUpperCase() ||
                  "FILE",

                size:
                  formatDatabaseSize(
                    Number(
                      document.file_size
                    )
                  ),

                uploadDate:
                  formatUploadDate(
                    document.upload_date
                  ),

                filePath:
                  document.file_path ||
                  "",
              };
            }
          );


        setDocuments(
          formattedDocuments
        );


      } catch (error) {

        console.error(
          "Error loading documents:",
          error
        );


        /*
          Don't show an alert every time
          the component initially loads.
          The error is visible in console.
        */

      } finally {

        setLoading(false);

      }

    };


  /* =====================================================
     LOAD DOCUMENTS ON PAGE OPEN
  ===================================================== */

  useEffect(() => {

    fetchDocuments();

  }, []);


  /* =====================================================
     OPEN UPLOAD MODAL
  ===================================================== */

  const openUploadModal =
    () => {

      setSelectedFile(null);

      setShowModal(true);

    };


  /* =====================================================
     CLOSE MODAL
  ===================================================== */

  const closeModal =
    () => {

      if (uploading) {
        return;
      }


      setSelectedFile(null);

      setShowModal(false);

    };


  /* =====================================================
     SELECT FILE
  ===================================================== */

  const handleFileChange = (
    event:
      React.ChangeEvent<HTMLInputElement>
  ) => {

    const file =
      event.target.files?.[0];


    if (!file) {
      return;
    }


    /*
      Maximum file size:
      10 MB
    */

    const maxSize =
      10 * 1024 * 1024;


    if (file.size > maxSize) {

      alert(
        "File size must be less than 10 MB."
      );


      event.target.value =
        "";


      return;

    }


    setSelectedFile(file);

  };


  /* =====================================================
     UPLOAD DOCUMENT
  ===================================================== */

  const uploadDocument =
    async () => {

      if (!selectedFile) {

        alert(
          "Please select a file."
        );

        return;

      }


      try {

        setUploading(true);


        const formData =
          new FormData();


        /*
          IMPORTANT:

          Backend uses:

          uploadDocument.single("file")

          Therefore the field
          name must be "file".
        */

        formData.append(
          "file",
          selectedFile
        );


        const response =
          await fetch(
            `${API_URL}/documents`,
            {
              method: "POST",
              headers: authHeaders(),
              body: formData,
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.message ||
            "Failed to upload document"
          );

        }


        /*
          Reload from MySQL.
        */

        await fetchDocuments();


        setSelectedFile(null);

        setShowModal(false);


      } catch (error) {

        console.error(
          "Error uploading document:",
          error
        );


        alert(
          error instanceof Error
            ? error.message
            : "Failed to upload document."
        );


      } finally {

        setUploading(false);

      }

    };


  /* =====================================================
     DELETE DOCUMENT
  ===================================================== */

  const deleteDocument =
    async (
      documentId: number
    ) => {

      const confirmed =
        window.confirm(
          "Are you sure you want to delete this document?"
        );


      if (!confirmed) {
        return;
      }


      try {

        const response =
          await fetch(
            `${API_URL}/documents/${documentId}`,
            {
              method: "DELETE",
              headers: authHeaders(),
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.message ||
            "Failed to delete document"
          );

        }


        /*
          Remove from screen
          after successful
          backend deletion.
        */

        setDocuments(
          (previous) =>
            previous.filter(
              (document) =>
                document.id !==
                documentId
            )
        );


      } catch (error) {

        console.error(
          "Error deleting document:",
          error
        );


        alert(
          error instanceof Error
            ? error.message
            : "Failed to delete document."
        );

      }

    };


  /* =====================================================
     DOWNLOAD DOCUMENT
  ===================================================== */

  const downloadDocument = async (documentItem: DocumentItem) => {
    try {
      const response = await fetch(`${API_URL}/documents/${documentItem.id}/download`, { headers: authHeaders() });
      if (!response.ok) throw new Error("You cannot access this document, or the file is missing.");
      const file = await response.blob();
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = documentItem.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not download the document.");
    }
  };


  /* =====================================================
     SEARCH
  ===================================================== */

  const filteredDocuments =
    documents.filter(
      (document) =>
        document.name
          .toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          )
    );


  /* =====================================================
     JSX
  ===================================================== */

  return (
    <div className="app-layout">

      <Navbar />


      <div className="app-body">

        <Sidebar />


        <main className="app-main">

          <div className="documents-page">


            {/* =============================================
                HEADER
            ============================================= */}

            <div className="documents-header">

              <div className="documents-title">

                <div className="documents-title-icon">

                  <FileText
                    size={22}
                  />

                </div>


                <div>

                  <h1>
                    Documents
                  </h1>

                  <p>
                    Store and manage your
                    work documents.
                  </p>

                </div>

              </div>


              <button
                className="documents-upload-button"
                onClick={
                  openUploadModal
                }
                disabled={uploading}
              >

                <Upload
                  size={17}
                />

                Upload document

              </button>

            </div>


            {/* =============================================
                SEARCH TOOLBAR
            ============================================= */}

            <div className="documents-toolbar">

              <div className="documents-search">

                <Search
                  size={18}
                />


                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                />


                {searchTerm && (

                  <button
                    className="documents-search-clear"
                    onClick={() =>
                      setSearchTerm("")
                    }
                    type="button"
                  >

                    <X
                      size={16}
                    />

                  </button>

                )}

              </div>


              <div className="documents-count">

                {filteredDocuments.length}{" "}

                document
                {filteredDocuments.length !==
                1
                  ? "s"
                  : ""}

              </div>

            </div>


            {/* =============================================
                DOCUMENT CARD
            ============================================= */}

            <div className="documents-card">


              {/* LOADING */}

              {loading ? (

                <div className="documents-empty">

                  <div className="documents-empty-icon">

                    <FileText
                      size={30}
                    />

                  </div>


                  <h2>
                    Loading documents...
                  </h2>


                  <p>
                    Please wait.
                  </p>

                </div>


              ) : filteredDocuments.length ===
                0 ? (


                /* EMPTY */

                <div className="documents-empty">

                  <div className="documents-empty-icon">

                    <FileText
                      size={30}
                    />

                  </div>


                  <h2>
                    No documents
                  </h2>


                  <p>
                    Upload your first
                    document to get
                    started.
                  </p>


                  <button
                    className="documents-empty-button"
                    onClick={
                      openUploadModal
                    }
                    type="button"
                  >

                    <Upload
                      size={16}
                    />

                    Upload document

                  </button>

                </div>


              ) : (


                /* DOCUMENT LIST */

                <div className="documents-list">

                  {filteredDocuments.map(
                    (documentItem) => (

                      <div
                        className="document-row"
                        key={
                          documentItem.id
                        }
                      >


                        {/* DOCUMENT INFO */}

                        <div className="document-info">

                          <div className="document-icon">

                            {getFileIcon(
                              documentItem.name
                            )}

                          </div>


                          <div className="document-name">

                            <h3>
                              {
                                documentItem.name
                              }
                            </h3>


                            <span>

                              {
                                documentItem.type
                              }

                              {" • "}

                              {
                                documentItem.size
                              }

                            </span>

                          </div>

                        </div>


                        {/* UPLOAD DATE */}

                        <div className="document-date">

                          {
                            documentItem.uploadDate
                          }

                        </div>


                        {/* ACTION BUTTONS */}

                        <div className="document-actions">

                          <button
                            className="document-download-button"
                            onClick={() =>
                              downloadDocument(
                                documentItem
                              )
                            }
                            title="Download"
                            type="button"
                          >

                            <Download
                              size={17}
                            />

                          </button>


                          <button
                            className="document-delete-button"
                            onClick={() =>
                              deleteDocument(
                                documentItem.id
                              )
                            }
                            title="Delete"
                            type="button"
                          >

                            <Trash2
                              size={17}
                            />

                          </button>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </div>

        </main>

      </div>


      {/* =============================================
          UPLOAD MODAL
      ============================================= */}

      {showModal && (

        <div
          className="documents-modal-overlay"
          onClick={
            closeModal
          }
        >

          <div
            className="documents-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >


            {/* MODAL HEADER */}

            <div className="documents-modal-header">

              <div>

                <h2>
                  Upload document
                </h2>

                <p>
                  Select a document
                  from your computer.
                </p>

              </div>


              <button
                className="documents-modal-close"
                onClick={
                  closeModal
                }
                disabled={uploading}
                type="button"
              >

                <X
                  size={19}
                />

              </button>

            </div>


            {/* FILE SELECT */}

            <label className="documents-upload-area">

              <Upload
                size={32}
              />


              <h3>

                {selectedFile
                  ? selectedFile.name
                  : "Choose a file"}

              </h3>


              <p>

                {selectedFile
                  ? formatFileSize(
                      selectedFile.size
                    )
                  : "Click to browse files"}

              </p>


              <input
                type="file"
                onChange={
                  handleFileChange
                }
                disabled={uploading}
              />

            </label>


            {/* MODAL BUTTONS */}

            <div className="documents-modal-actions">

              <button
                className="documents-cancel-button"
                onClick={
                  closeModal
                }
                disabled={uploading}
                type="button"
              >

                Cancel

              </button>


              <button
                className="documents-save-button"
                onClick={
                  uploadDocument
                }
                disabled={
                  uploading ||
                  !selectedFile
                }
                type="button"
              >

                <Upload
                  size={16}
                />


                {uploading
                  ? "Uploading..."
                  : "Upload"}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}


/* =====================================================
   EXPORT
===================================================== */

export default Documents;
