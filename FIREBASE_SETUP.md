# Firebase setup for OWL Trader

The app stores each user's journal under `users/{uid}` in Realtime Database. Trade screenshots are uploaded to Storage under `users/{uid}/trades/...` when the user is signed in and online. Local entries continue to work when offline; pending screenshots stay on the device until a later sync. Data URLs are deliberately removed from cloud records, so screenshots sync between devices only after Firebase Storage is enabled and its rules are published.

## Realtime Database rules

In Firebase Console, open **Realtime Database → Rules**, replace the editor content with `database.rules.json`, then publish. These rules prevent reading or writing another user's data.

## Storage rules

If Storage has not been initialized, open **Build → Storage → Get started** and create the bucket. Then open **Storage → Rules**, replace the editor content with `storage.rules`, and publish. These rules allow signed-in users to read, upload, and delete their own images only. The app compresses screenshots before upload and the rule rejects files at or above 2 MB. If Storage is unavailable, screenshots remain on the device and ZIP backup can still include them.

## Authentication and domains

Keep Email/Password and Google providers enabled under **Authentication → Sign-in method**. Add `snoopy1989doo-source.github.io` and any development host under **Authentication → Settings → Authorized domains**. The app uses the Firebase popup flow for Google sign-in, which avoids the redirect/sessionStorage failure seen in some mobile Firefox versions.

After publishing web files, reopen the app or reload it once while online so the service worker activates the new cache version. On mobile, sign in before checking the sync badge; the badge says **LOGIN REQUIRED** while signed out and **OFFLINE** only when a signed-in account cannot reach Firebase.
