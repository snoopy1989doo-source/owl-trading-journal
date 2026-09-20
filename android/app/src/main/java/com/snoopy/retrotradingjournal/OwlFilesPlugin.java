package com.snoopy.retrotradingjournal;

import android.app.Activity;
import android.content.Intent;
import android.content.ClipData;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/** Export only to a destination explicitly selected by the user. */
@CapacitorPlugin(name = "OwlFiles")
public class OwlFilesPlugin extends Plugin {
    private String filename(PluginCall call) {
        return call.getString("filename", "owl-export.txt").replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
    }

    private byte[] bytes(PluginCall call) {
        String data = call.getString("base64");
        if (data == null || data.length() > 140000000) throw new IllegalArgumentException("File is empty or exceeds 100 MB");
        return Base64.decode(data, Base64.DEFAULT);
    }

    @PluginMethod
    public void saveFile(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(call.getString("mimeType", "application/octet-stream"));
        intent.putExtra(Intent.EXTRA_TITLE, filename(call));
        try { startActivityForResult(call, intent, "fileSelected"); }
        catch (Exception e) { call.reject("Cannot open the Android file picker", e); }
    }

    @ActivityCallback
    private void fileSelected(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject response = new JSObject(); response.put("cancelled", true); call.resolve(response); return;
        }
        Uri uri = result.getData().getData();
        if (uri == null) { call.reject("No destination was selected"); return; }
        getBridge().execute(() -> {
            try {
                byte[] data = bytes(call);
                try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                    if (stream == null) throw new java.io.IOException("Destination is not writable");
                    stream.write(data); stream.flush();
                }
                String name = filename(call);
                try (Cursor cursor = getContext().getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
                    if (cursor != null && cursor.moveToFirst()) name = cursor.getString(0);
                }
                JSObject response = new JSObject();
                response.put("saved", true); response.put("filename", name);
                response.put("uri", uri.toString()); response.put("bytes", data.length);
                call.resolve(response);
            } catch (Exception e) { call.reject("Cannot write the selected file: " + e.getMessage(), e); }
        });
    }

    @PluginMethod
    public void shareFile(PluginCall call) {
        try {
            File folder = new File(getContext().getCacheDir(), "owl-exports");
            if (!folder.exists() && !folder.mkdirs()) throw new java.io.IOException("Cannot create export cache");
            // Each export has its own file so a later report cannot overwrite one being shared.
            File directory = new File(folder, java.util.UUID.randomUUID().toString());
            if (!directory.mkdirs()) throw new java.io.IOException("Cannot prepare export");
            File file = new File(directory, filename(call));
            try (FileOutputStream stream = new FileOutputStream(file)) { stream.write(bytes(call)); }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType(call.getString("mimeType", "application/octet-stream"));
            intent.putExtra(Intent.EXTRA_STREAM, uri);
            intent.setClipData(ClipData.newRawUri(filename(call), uri));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(intent, "ส่งออกจาก OWL Trader"));
            JSObject response = new JSObject(); response.put("chooserOpened", true); call.resolve(response);
        } catch (Exception e) { call.reject("Cannot share file: " + e.getMessage(), e); }
    }
}
