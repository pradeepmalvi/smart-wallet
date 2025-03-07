import crypto from "crypto";
import { Hex, toHex } from "viem";
import cbor from "cbor";
import { parseAuthenticatorData } from "@simplewebauthn/server/helpers";
import { AsnParser } from "@peculiar/asn1-schema";
import { ECDSASigValue } from "@peculiar/asn1-ecc";
import { concatUint8Arrays } from "@/utils/arrayConcat";
import { CreateCredential, P256Credential, P256Signature } from "@/libs/web-authn/types";
import { shouldRemoveLeadingZero } from "@/utils/removeLeadingZero";
import { startRegistration } from "@simplewebauthn/browser";
import { generateRegistrationOptions } from "@simplewebauthn/server";

export * from "@/libs/web-authn/types";

export class WebAuthn {
  private static _generateRandomBytes(): Buffer {
    return crypto.randomBytes(16);
  }

  public static isSupportedByBrowser(): boolean {
    console.log(
      "isSupportedByBrowser",
      window?.PublicKeyCredential !== undefined && typeof window.PublicKeyCredential === "function",
    );
    return (
      window?.PublicKeyCredential !== undefined && typeof window.PublicKeyCredential === "function"
    );
  }

  public static async platformAuthenticatorIsAvailable(): Promise<boolean> {
    if (
      !this.isSupportedByBrowser() &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function"
    ) {
      return false;
    }
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  }

  public static async isConditionalSupported(): Promise<boolean> {
    if (
      !this.isSupportedByBrowser() &&
      typeof window.PublicKeyCredential.isConditionalMediationAvailable !== "function"
    ) {
      return false;
    }
    return await PublicKeyCredential.isConditionalMediationAvailable();
  }

  public static async isConditional() {
    if (
      typeof window.PublicKeyCredential !== "undefined" &&
      typeof window.PublicKeyCredential.isConditionalMediationAvailable === "function"
    ) {
      const available = await PublicKeyCredential.isConditionalMediationAvailable();

      if (available) {
        this.get();
      }
    }
  }

  public static async create({ username }: { username: string }): Promise<CreateCredential | null> {
    this.isSupportedByBrowser();

    const options: any = {
      timeout: 60000,
      rp: {
        name: "passkeys-4337/smart-wallet",
        id: window.location.hostname,
      },
      user: {
        id: this._generateRandomBytes(),
        name: username,
        displayName: username,
      },
      attestation: "direct",
      challenge: Uint8Array.from("random-challenge", (c) => c.charCodeAt(0)),
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        userVerification: "required",
        residentKey: "required",
        authenticatorAttachment: "cross-platform",
      },
      extensions: {
        prf: { eval: { first: Uint8Array.from(atob("Zmlyc3RTYWx0"), (c) => c.charCodeAt(0)) } },
      },
    };

    const credential = await navigator.credentials.create({
      publicKey: options,
    });

    // Hoping for `{ prf: { enabled: true } }`
    const extResults = (credential as any).getClientExtensionResults();

    function arrayBufferToBase64(buffer: ArrayBuffer) {
      let binary = "";
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    }

    // Later in your code, log the Base64 string:
    if (
      extResults.prf &&
      extResults.prf.results &&
      extResults.prf.results.first instanceof ArrayBuffer
    ) {
      console.log(`PRF result as base64: ${arrayBufferToBase64(extResults.prf.results.first)}`);
    } else {
      console.log("PRF result is not available or not in the expected format.");
    }

    debugger;

    if (!credential) {
      return null;
    }

    let cred = credential as unknown as {
      rawId: ArrayBuffer;
      response: {
        clientDataJSON: ArrayBuffer;
        attestationObject: ArrayBuffer;
      };
    };

    // decode attestation object and get public key
    const decodedAttestationObj = cbor.decode(cred.response.attestationObject);
    const authData = parseAuthenticatorData(decodedAttestationObj.authData);
    const publicKey = cbor.decode(authData?.credentialPublicKey?.buffer as ArrayBuffer);
    const x = toHex(publicKey.get(-2));
    const y = toHex(publicKey.get(-3));

    // SAVE PUBKEY TO FACTORY
    return {
      rawId: toHex(new Uint8Array(cred.rawId)),
      pubKey: {
        x,
        y,
      },
    };
  }

  public static async get(challenge?: Hex): Promise<P256Credential | null> {
    this.isSupportedByBrowser();

    const options: any = {
      timeout: 60000,
      challenge: challenge
        ? Buffer.from(challenge.slice(2), "hex")
        : Uint8Array.from("random-challenge", (c) => c.charCodeAt(0)),
      rpId: window.location.hostname,
      userVerification: "preferred",
      extensions: {
        prf: { eval: { first: Uint8Array.from(atob("Zmlyc3RTYWx0"), (c) => c.charCodeAt(0)) } },
      },
    } as any;

    const credential = await window.navigator.credentials.get({
      publicKey: options,
    });

    const extResults = (credential as any).getClientExtensionResults();

    function arrayBufferToBase64(buffer: ArrayBuffer) {
      let binary = "";
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    }

    // Later in your code, log the Base64 string:
    if (
      extResults.prf &&
      extResults.prf.results &&
      extResults.prf.results.first instanceof ArrayBuffer
    ) {
      console.log(`PRF result as base64: ${arrayBufferToBase64(extResults.prf.results.first)}`);
    } else {
      console.log("PRF result is not available or not in the expected format.");
    }

    debugger;
    if (!credential) {
      return null;
    }

    let cred = credential as unknown as {
      rawId: ArrayBuffer;
      response: {
        clientDataJSON: ArrayBuffer;
        authenticatorData: ArrayBuffer;
        signature: ArrayBuffer;
        userHandle: ArrayBuffer;
      };
    };

    const utf8Decoder = new TextDecoder("utf-8");

    const decodedClientData = utf8Decoder.decode(cred.response.clientDataJSON);
    const clientDataObj = JSON.parse(decodedClientData);

    let authenticatorData = toHex(new Uint8Array(cred.response.authenticatorData));
    let signature = parseSignature(new Uint8Array(cred?.response?.signature));

    console.log("credential", credential);

    return {
      rawId: toHex(new Uint8Array(cred.rawId)),
      clientData: {
        type: clientDataObj.type,
        challenge: clientDataObj.challenge,
        origin: clientDataObj.origin,
        crossOrigin: clientDataObj.crossOrigin,
      },
      authenticatorData,
      signature,
    };
  }
}

// Parse the signature from the authenticator and remove the leading zero if necessary
export function parseSignature(signature: Uint8Array): P256Signature {
  const parsedSignature = AsnParser.parse(signature, ECDSASigValue);
  let rBytes = new Uint8Array(parsedSignature.r);
  let sBytes = new Uint8Array(parsedSignature.s);
  if (shouldRemoveLeadingZero(rBytes)) {
    rBytes = rBytes.slice(1);
  }
  if (shouldRemoveLeadingZero(sBytes)) {
    sBytes = sBytes.slice(1);
  }
  const finalSignature = concatUint8Arrays([rBytes, sBytes]);
  return {
    r: toHex(finalSignature.slice(0, 32)),
    s: toHex(finalSignature.slice(32)),
  };
}
