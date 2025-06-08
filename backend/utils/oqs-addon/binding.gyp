{
  "targets": [
    {
      "target_name": "oqs_addon",
      "sources": [ "oqs_addon.cc" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "../../../external_libs/liboqs/build/include/"
      ],
      "libraries": [
        "../../../../external_libs/liboqs/build/lib/Release/oqs.lib"
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
