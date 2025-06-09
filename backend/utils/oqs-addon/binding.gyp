{
  "targets": [
    {
      "target_name": "oqs_addon",
      "sources": [ "oqs_addon.cc" ],
      "include_dirs": [
  "<!@(node -p \"require('node-addon-api').include\")",
  "<!(node -e \"require('nan')\")",
  "/usr/local/include"
],
      "libraries": [
  "/usr/local/lib/liboqs.so"
],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1
        }
      }
    }
  ]
}
