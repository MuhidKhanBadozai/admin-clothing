/**
 * Google Drive Cloud Storage Service for FAMA Admin
 * Zero-cost photo storage connected to personal Google Drive.
 */

export interface GoogleDriveConfig {
  scriptUrl: string;
  folderId: string;
  autoDirectUrl: boolean;
}

const STORAGE_KEY = 'fama_admin_gdrive_config';

export const DEFAULT_APPS_SCRIPT_CODE = `/**
 * FAMA E-Commerce - Google Drive Image Storage Webhook
 * Paste this into script.google.com and deploy as Web App
 * 
 * 1. Open https://script.google.com
 * 2. Click "New project"
 * 3. Paste this entire code
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set "Execute as": "Me"
 * 7. Set "Who has access": "Anyone" (crucial for uploads from website)
 * 8. Click "Deploy", copy the Web App URL and paste it in FAMA Admin Panel!
 */

function doPost(e) {
  try {
    var rawData = e.postData ? e.postData.contents : null;
    if (!rawData) {
      return createJsonResponse({ status: "error", message: "No data received" });
    }
    
    var data = JSON.parse(rawData);
    var folder;
    
    // Check if target folder ID is specified
    if (data.folderId && data.folderId.trim().length > 0) {
      try {
        folder = DriveApp.getFolderById(data.folderId.trim());
      } catch (fErr) {
        folder = DriveApp.getRootFolder();
      }
    } else {
      folder = DriveApp.getRootFolder();
    }
    
    // Extract base64 and mime type
    var base64Data = data.base64;
    var contentType = data.type || "image/jpeg";
    var filename = data.filename || ("product_" + new Date().getTime() + ".jpg");
    
    if (base64Data.indexOf(",") > -1) {
      base64Data = base64Data.split(",")[1];
    }
    
    var decodedBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, filename);
    var file = folder.createFile(decodedBlob);
    
    // Make file publicly accessible so customers can view it on the store
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileId = file.getId();
    // thumbnail?id= format reliably works as <img> src without redirects
    var directUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1000";
    var ucUrl = "https://drive.google.com/uc?export=view&id=" + fileId;
    
    return createJsonResponse({
      status: "success",
      fileId: fileId,
      url: directUrl,
      viewUrl: ucUrl,
      filename: filename
    });
  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

function doGet(e) {
  return createJsonResponse({
    status: "ok",
    message: "FAMA Google Drive Storage Webhook is running and ready!"
  });
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

class GoogleDriveService {
  public getConfig(): GoogleDriveConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return {
      scriptUrl: 'https://script.google.com/macros/s/AKfycbx_SWmlDMaMCoRK_GBy3KoOnY1I9_bUMM3kUwkTZd0aA9NDmVHQODY7c6EOvW-bptVM/exec',
      folderId: '',
      autoDirectUrl: true,
    };
  }

  public saveConfig(config: GoogleDriveConfig): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  /**
   * Helper to normalize any Google Drive link to high-speed embeddable CDN link
   */
  public convertToDirectGoogleDriveUrl(url: string): string {
    if (!url || typeof url !== 'string') return url;
    const trimmed = url.trim();

    const toDirectLh3 = (id: string) => `https://lh3.googleusercontent.com/d/${id}`;

    // Already lh3 format
    if (trimmed.includes('lh3.googleusercontent.com/d/')) {
      return trimmed;
    }

    // Convert thumbnail URLs
    const thumbMatch = trimmed.match(/drive\.google\.com\/thumbnail\?id=([a-zA-Z0-9_-]+)/);
    if (thumbMatch && thumbMatch[1]) {
      return toDirectLh3(thumbMatch[1]);
    }

    // Convert uc?export=view URLs
    const ucMatch = trimmed.match(/drive\.google\.com\/uc\?.*?id=([a-zA-Z0-9_-]+)/);
    if (ucMatch && ucMatch[1]) {
      return toDirectLh3(ucMatch[1]);
    }

    // Match /file/d/{FILE_ID}/
    const fileIdMatch1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch1 && fileIdMatch1[1]) {
      return toDirectLh3(fileIdMatch1[1]);
    }

    // Match id={FILE_ID}
    const fileIdMatch2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch2 && fileIdMatch2[1]) {
      return toDirectLh3(fileIdMatch2[1]);
    }

    return trimmed;
  }

  /**
   * Convert a File object to base64 data URL
   */
  public fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  /**
   * Upload image file directly to Google Drive via Apps Script Webhook
   */
  public async uploadImage(file: File, onProgress?: (percent: number) => void): Promise<{ url: string; fileId?: string; filename: string }> {
    const config = this.getConfig();
    const base64 = await this.fileToBase64(file);

    if (onProgress) onProgress(30);

    if (!config.scriptUrl || !config.scriptUrl.trim()) {
      throw new Error('Google Drive Storage is not configured. Please open the Drive Storage settings and enter your Web App URL.');
    }

    const payload = {
      base64,
      filename: `product_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
      type: file.type || 'image/jpeg',
      folderId: config.folderId ? config.folderId.trim() : undefined,
    };

    if (onProgress) onProgress(60);

    try {
      const response = await fetch(config.scriptUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (onProgress) onProgress(90);

      const result = await response.json();

      if (result.status === 'success' && result.url) {
        if (onProgress) onProgress(100);
        return {
          url: this.convertToDirectGoogleDriveUrl(result.url),
          fileId: result.fileId,
          filename: result.filename || file.name,
        };
      } else {
        throw new Error(result.message || 'Google Drive webhook returned an error');
      }
    } catch (err: any) {
      console.error('Google Drive Upload Error:', err);
      throw new Error(
        err.message ||
          'Failed to upload image to Google Drive. Please ensure the Apps Script Webhook URL is deployed with "Anyone" access.'
      );
    }
  }

  /**
   * Test connection to Google Drive Apps Script Webhook
   */
  public async testConnection(scriptUrl: string, folderId?: string): Promise<{ success: boolean; message: string }> {
    try {
      const trimmedUrl = scriptUrl.trim();
      if (!trimmedUrl) {
        return { success: false, message: 'Please enter a valid Google Apps Script Web App URL' };
      }

      // 1x1 transparent png test pixel
      const testBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const payload = {
        base64: testBase64,
        filename: `_fama_drive_connection_test_${Date.now()}.png`,
        type: 'image/png',
        folderId: folderId ? folderId.trim() : undefined,
      };

      const response = await fetch(trimmedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.status === 'success') {
        return {
          success: true,
          message: `Connected successfully! Test image created with ID: ${result.fileId}`,
        };
      } else {
        return {
          success: false,
          message: result.message || 'Google Drive script returned an error',
        };
      }
    } catch (e: any) {
      return {
        success: false,
        message: `Connection failed: ${e.message || 'Check URL and ensure access is set to "Anyone"'}`,
      };
    }
  }
}

export const googleDriveService = new GoogleDriveService();
