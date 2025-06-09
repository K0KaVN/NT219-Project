#include <napi.h>
#include <iostream>
#include <string>
#include <vector>

// Bắt đầu khối extern "C" để khai báo các hàm C từ OQS
extern "C" {
#include <oqs/oqs.h> // Include OQS library header
}
// Kết thúc khối extern "C"

// Choose the desired OQS algorithm
// CHÚ Ý: Thay đổi thành chuỗi tên thuật toán phù hợp với OQS
#define OQS_SIG_ALGORITHM "Dilithium3" // Ví dụ: "Dilithium3" tương ứng với OQS_SIG_alg_dilithium3

OQS_SIG* sig = NULL;

// --- Helper function to convert NAPI Value to std::string ---
std::string NapiValueToString(const Napi::Value& value) {
    if (value.IsString()) {
        return value.As<Napi::String>().Utf8Value();
    }
    return "";
}

// --- Key Generation Function ---
Napi::Value GenerateKeyPair(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (sig == NULL) {
        sig = OQS_SIG_new(OQS_SIG_ALGORITHM); // Sử dụng chuỗi tên thuật toán
        if (sig == NULL) {
            Napi::Error::New(env, "Failed to initialize OQS_SIG for " OQS_SIG_ALGORITHM).ThrowAsJavaScriptException();
            return env.Null();
        }
    }

    uint8_t* public_key = (uint8_t*)malloc(sig->length_public_key);
    uint8_t* secret_key = (uint8_t*)malloc(sig->length_secret_key);

    if (public_key == NULL || secret_key == NULL) {
        free(public_key);
        free(secret_key);
        Napi::Error::New(env, "Failed to allocate memory for keys").ThrowAsJavaScriptException();
        return env.Null();
    }

    OQS_STATUS status = OQS_SIG_keypair(sig, public_key, secret_key);

    if (status != OQS_SUCCESS) {
        free(public_key);
        free(secret_key);
        Napi::Error::New(env, "OQS_SIG_keypair failed").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object result = Napi::Object::New(env);
    // Convert to Napi::Buffer for Node.js
    result.Set("publicKey", Napi::Buffer<uint8_t>::Copy(env, public_key, sig->length_public_key));
    result.Set("secretKey", Napi::Buffer<uint8_t>::Copy(env, secret_key, sig->length_secret_key));

    free(public_key);
    free(secret_key);

    return result;
}

// --- Signing Function ---
Napi::Value SignMessage(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2 || !info[0].IsBuffer() || !info[1].IsBuffer()) {
        Napi::TypeError::New(env, "Expected two arguments: (messageBuffer, secretKeyBuffer)").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Buffer<uint8_t> messageBuffer = info[0].As<Napi::Buffer<uint8_t>>();
    Napi::Buffer<uint8_t> secretKeyBuffer = info[1].As<Napi::Buffer<uint8_t>>();

    if (sig == NULL) {
        sig = OQS_SIG_new(OQS_SIG_ALGORITHM); // Sử dụng chuỗi tên thuật toán
        if (sig == NULL) {
            Napi::Error::New(env, "Failed to initialize OQS_SIG for " OQS_SIG_ALGORITHM).ThrowAsJavaScriptException();
            return env.Null();
        }
    }
    if (secretKeyBuffer.Length() != sig->length_secret_key) {
        Napi::Error::New(env, "Invalid secret key length").ThrowAsJavaScriptException();
        return env.Null();
    }

    uint8_t* signature = (uint8_t*)malloc(sig->length_signature);
    size_t signature_len = 0;

    if (signature == NULL) {
        Napi::Error::New(env, "Failed to allocate memory for signature").ThrowAsJavaScriptException();
        return env.Null();
    }

    OQS_STATUS status = OQS_SIG_sign(sig, signature, &signature_len, messageBuffer.Data(), messageBuffer.Length(), secretKeyBuffer.Data());

    if (status != OQS_SUCCESS) {
        free(signature);
        Napi::Error::New(env, "OQS_SIG_sign failed").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Buffer<uint8_t> result = Napi::Buffer<uint8_t>::Copy(env, signature, signature_len);
    free(signature);

    return result;
}

// --- Verification Function ---
Napi::Value VerifyMessage(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 3 || !info[0].IsBuffer() || !info[1].IsBuffer() || !info[2].IsBuffer()) {
        Napi::TypeError::New(env, "Expected three arguments: (messageBuffer, signatureBuffer, publicKeyBuffer)").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Buffer<uint8_t> messageBuffer = info[0].As<Napi::Buffer<uint8_t>>();
    Napi::Buffer<uint8_t> signatureBuffer = info[1].As<Napi::Buffer<uint8_t>>();
    Napi::Buffer<uint8_t> publicKeyBuffer = info[2].As<Napi::Buffer<uint8_t>>();

    if (sig == NULL) {
        sig = OQS_SIG_new(OQS_SIG_ALGORITHM); // Sử dụng chuỗi tên thuật toán
        if (sig == NULL) {
            Napi::Error::New(env, "Failed to initialize OQS_SIG for " OQS_SIG_ALGORITHM).ThrowAsJavaScriptException();
            return env.Null();
        }
    }
    if (publicKeyBuffer.Length() != sig->length_public_key) {
        Napi::Error::New(env, "Invalid public key length").ThrowAsJavaScriptException();
        return env.Null();
    }

    OQS_STATUS status = OQS_SIG_verify(sig, messageBuffer.Data(), messageBuffer.Length(), signatureBuffer.Data(), signatureBuffer.Length(), publicKeyBuffer.Data());

    return Napi::Boolean::New(env, status == OQS_SUCCESS);
}

// --- Module Initialization ---
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // Initialize OQS (important for random number generation and algorithm availability)
    OQS_init(); // Call this once per process

    exports.Set(Napi::String::New(env, "generateKeyPair"), Napi::Function::New(env, GenerateKeyPair));
    exports.Set(Napi::String::New(env, "signMessage"), Napi::Function::New(env, SignMessage));
    exports.Set(Napi::String::New(env, "verifyMessage"), Napi::Function::New(env, VerifyMessage));

    // Bạn có thể muốn hiển thị thông tin thuật toán
    exports.Set(Napi::String::New(env, "algorithm"), Napi::String::New(env, OQS_SIG_ALGORITHM)); // Sử dụng chuỗi tên thuật toán

    // Tạm thời khởi tạo sig để lấy các độ dài, sau đó giải phóng
    OQS_SIG* temp_sig = OQS_SIG_new(OQS_SIG_ALGORITHM); // Sử dụng chuỗi tên thuật toán
    if (temp_sig != NULL) {
        exports.Set(Napi::String::New(env, "publicKeyLength"), Napi::Number::New(env, temp_sig->length_public_key));
        exports.Set(Napi::String::New(env, "secretKeyLength"), Napi::Number::New(env, temp_sig->length_secret_key));
        exports.Set(Napi::String::New(env, "signatureLength"), Napi::Number::New(env, temp_sig->length_signature));
        OQS_SIG_free(temp_sig); // Giải phóng đối tượng tạm thời
    }
    else {
        std::cerr << "Warning: Could not initialize temporary OQS_SIG object to get lengths." << std::endl;
    }

    return exports;
}

NODE_API_MODULE(oqs_addon, Init)