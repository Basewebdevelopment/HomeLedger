/**
 * Storage utilities for the Household Ledger app
 * 
 * Uses localStorage for client-side data persistence.
 * Data is stored as JSON and automatically serialized/deserialized.
 */

const STORAGE_KEY = "household-data";

/**
 * Export all household data as a JSON file
 */
export function exportData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      alert("No data to export");
      return;
    }
    
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `household-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Failed to export data:", e);
    alert("Failed to export data. Check console for details.");
  }
}

/**
 * Import household data from a JSON file
 */
export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        resolve(data);
      } catch (err) {
        reject(new Error("Invalid JSON file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Clear all household data (with confirmation)
 */
export function clearAllData() {
  if (confirm("Are you sure you want to delete ALL household data? This cannot be undone.")) {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }
}

/**
 * Get current storage usage
 */
export function getStorageInfo() {
  const data = localStorage.getItem(STORAGE_KEY);
  const bytes = data ? new Blob([data]).size : 0;
  const kb = (bytes / 1024).toFixed(2);
  const limit = 5120; // localStorage typically has 5-10MB limit
  const percent = ((bytes / 1024 / limit) * 100).toFixed(1);
  
  return {
    bytes,
    kb: `${kb} KB`,
    percent: `${percent}%`,
    limit: `~${limit} KB`,
  };
}

/**
 * Check if localStorage is available
 */
export function isStorageAvailable() {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}
