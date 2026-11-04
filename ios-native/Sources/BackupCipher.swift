import Foundation
import CryptoKit
import CommonCrypto
import Security

/// Compatible con backup-crypto.js de Budviva: PBKDF2/SHA256 (310.000 iteraciones) + AES-256-GCM.
/// La clave y la contraseña no se escriben en disco.
enum BackupCipher {
    private static let rounds = 310_000
    private static let formatName = "budviva-encrypted-v1"

    struct Envelope: Codable {
        var format: String
        var kdf: String
        var iterations: Int
        var salt: String
        var iv: String
        var ciphertext: String
    }

    enum CipherError: LocalizedError {
        case invalidPassword, invalidFormat, authenticationFailed, entropyFailed, keyDerivationFailed
        var errorDescription: String? {
            switch self {
            case .invalidPassword: return "La contraseña debe tener al menos 12 caracteres."
            case .invalidFormat: return "La copia cifrada no tiene un formato reconocido."
            case .authenticationFailed: return "Contraseña incorrecta o copia dañada."
            case .entropyFailed: return "No se pudo crear el cifrado seguro."
            case .keyDerivationFailed: return "No se pudo derivar la clave de cifrado."
            }
        }
    }

    static func isEncrypted(_ data:Data) -> Bool {
        guard let object = try? JSONSerialization.jsonObject(with:data) as? [String:Any] else {return false}
        return object["format"] as? String == formatName
    }

    private static func randomData(count:Int) throws -> Data {
        var bytes=[UInt8](repeating:0,count:count)
        guard SecRandomCopyBytes(kSecRandomDefault, count, &bytes) == errSecSuccess else {
            throw CipherError.entropyFailed
        }
        return Data(bytes)
    }

    private static func deriveKey(password:String,salt:Data) throws -> SymmetricKey {
        guard password.count >= 12 && password.utf8.count <= 1024 else {throw CipherError.invalidPassword}
        var derived=[UInt8](repeating:0,count:32)
        let status=password.withCString { buffer in
            salt.withUnsafeBytes { raw in
                CCKeyDerivationPBKDF(CCPBKDFAlgorithm(kCCPBKDF2),buffer,
                    password.lengthOfBytes(using:.utf8), raw.bindMemory(to:UInt8.self).baseAddress!,
                    salt.count,CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256),UInt32(rounds),
                    &derived,derived.count)
            }
        }
        guard status == kCCSuccess else {throw CipherError.keyDerivationFailed}
        return SymmetricKey(data:Data(derived))
    }

    static func encrypt(_ source:Data,password:String) throws -> Data {
        let salt=try randomData(count:16),iv=try randomData(count:12)
        let key=try deriveKey(password:password,salt:salt)
        let nonce=try AES.GCM.Nonce(data:iv)
        let sealed=try AES.GCM.seal(source,using:key,nonce:nonce)
        let ciphertext=sealed.ciphertext+sealed.tag
        let payload=Envelope(format:formatName,kdf:"PBKDF2-SHA256",iterations:rounds,
            salt:salt.base64EncodedString(),iv:iv.base64EncodedString(),
            ciphertext:ciphertext.base64EncodedString())
        return try JSONEncoder().encode(payload)
    }

    static func decrypt(_ input:Data,password:String) throws -> Data {
        let payload:Envelope
        do{payload=try JSONDecoder().decode(Envelope.self,from:input)}
        catch{throw CipherError.invalidFormat}
        guard payload.format == formatName,payload.kdf == "PBKDF2-SHA256",
              payload.iterations == rounds,
              let salt=Data(base64Encoded:payload.salt),salt.count==16,
              let iv=Data(base64Encoded:payload.iv),iv.count==12,
              let body=Data(base64Encoded:payload.ciphertext),body.count>=16 else {
            throw CipherError.invalidFormat
        }
        let key=try deriveKey(password:password,salt:salt)
        do {
            let box=try AES.GCM.SealedBox(combined:iv+body)
            return try AES.GCM.open(box,using:key)
        } catch {
            throw CipherError.authenticationFailed
        }
    }
}
