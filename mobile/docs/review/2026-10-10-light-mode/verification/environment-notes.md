# Verification environment notes

The first Home capture was rejected because the app never reached its ready state; no before/after screenshot pass is claimed from that attempt. The before-capture attempt was stopped before any accepted frames.

The local Metro `/status` endpoint returned 200 while `/` timed out after five seconds. A sample of the owned Metro process showed synchronous filesystem reads. Metro was already configured with `useWatchman: false` and only the shared-source folder watched outside mobile. No app resolver change was made.

System inspection showed very little free memory while other user applications were running. The assistant-owned Chrome and Metro processes were stopped so verification can proceed sequentially. No unrelated user process was changed. This is a resource/scheduling investigation, not evidence of an app runtime exception.

After the code checks completed, an isolated fixture-only Metro server was started on port 8091. The first prewarm polling loop exhausted its attempt count before server startup; its elapsed-time deadline was corrected in a temporary helper. A subsequent prewarm received the full app bundle (17,645,216 bytes) successfully in about 144 seconds. Chrome captures then completed successfully: eight light screens with guided interactions, followed by two dark smoke screens. No application resolver or runtime code was changed to make the preview load. Accepted captures are in `pearl-cobalt-390/` and `dark-390/`; earlier failed attempts remain excluded from visual validation.
