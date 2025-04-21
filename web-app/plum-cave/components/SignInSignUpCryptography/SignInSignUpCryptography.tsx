"use client";

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2'; // Import SweetAlert2
import { argon2id, whirlpool, sha512 } from 'hash-wasm';
import { encryptSerpent256ECB } from '@/app/cryptographicPrimitives/serpent';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { db, auth } from '@/app/lib/firebase';
import { doc, setDoc, getDoc, collection } from "firebase/firestore"; 
import { FirebaseError } from 'firebase/app';
import { MlKem1024 } from 'mlkem';
import { silentlyEncryptDataWithTwoCiphersCBCnoPadding } from '@/app/cryptographicPrimitives/twoCiphersSilentMode';
import useStore from '@/store/store';

const useSignInSignUpCryptography = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "he";
  const {setLoginData, setIsLoggedIn } = useStore();

  const derive336BytesUsingArgon2id = useCallback(async (
    password: string, 
    salt: Uint8Array, 
    iterations: number,
  ): Promise<Uint8Array> => {
    const derivedKey = await argon2id({
      password,
      salt,
      parallelism: 1,
      iterations,
      memorySize: 512,
      hashLength: 336,
      outputType: 'binary',
    });
    return new Uint8Array(derivedKey);
  }, []);

  const handleSignIn = async () => {
    Swal.fire({
      title: t('deriving_keys'), // Use translation key for this message
      html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`, // Use translation key for this message
      color: "var(--foreground)",
      background: "var(--card-background)",
      width: 640,
      allowOutsideClick: false,
      customClass: {
          popup: "swal-custom-popup", // Custom class for styling
      },
      didOpen: () => {
          Swal.showLoading();
      }
  });  
};

const handleSignInContinue = async (email: string, password: string) => {

  const sha512EmailOutput = await sha512(email);
  const sha512EmailArray = hexStringToArray(sha512EmailOutput);
  const emailByteArray = new Uint8Array(sha512EmailArray);

  // Hash the email using Whirlpool to generate a robust salt
  const emailWhirlpoolHash = await whirlpool(emailByteArray);
  const hashedEmailSalt = new Uint8Array(hexStringToArray(emailWhirlpoolHash));

  // Hash the password using SHA-512
  const sha512PasswordOutput = await sha512(password);
  const sha512PasswordArray = hexStringToArray(sha512PasswordOutput);
  const passwordByteArray = new Uint8Array(sha512PasswordArray);

  // Hash the password result using Whirlpool
  const passwordWhirlpoolHash = await whirlpool(passwordByteArray);
  const hashedPassword = new Uint8Array(hexStringToArray(passwordWhirlpoolHash));

  // Use the entire hashed password for iterations (between 1100 and 1400)
  const iterationBytes = hashedPassword; // Use the full hashed password
  const derIterations = iterationBytes.reduce((acc, val) => acc + val, 0);
  const iterations = 1100 + (derIterations % (1400 - 1100 + 1)); // Ensure iterations are in range [1100,1400]

  // XOR the hashed email salt and hashed password to generate the final salt
  const saltLength = Math.min(hashedEmailSalt.length, hashedPassword.length); // Ensure lengths match
  const finalSalt = new Uint8Array(saltLength);
  for (let i = 0; i < saltLength; i++) {
    finalSalt[i] = hashedEmailSalt[i] ^ hashedPassword[i];
  }

  // Key derivation using Argon2id with password and final salt
  const derivedKey = await derive336BytesUsingArgon2id(password, finalSalt, iterations);

  // Extract user IDs and encryption key from derived key
  const userID1 = derivedKey.slice(0, 16);
  const userID2 = derivedKey.slice(16, 32);

  // Decrypt unencrypted password using XOR operation
  const unencryptedPassword = userID1.map((byte, index) => byte ^ userID2[index]);

  const userCredentialEncryptionKey = derivedKey.slice(32, 64);

  // Encrypt user password using Serpent-256 ECB mode
  const encryptedUserPassword = encryptSerpent256ECB(unencryptedPassword, userCredentialEncryptionKey);
//console.log("email:" + email);
//console.log("Password:" + arrayToHexString(encryptedUserPassword));
try {
  // Display loading message during sign-in
  Swal.fire({
      title: t('signing_in'), // Use translation key for this message
      html: `<p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`, // Use translation key for this message
      color: "var(--foreground)",
      background: "var(--card-background)",
      width: 640,
      allowOutsideClick: false,
      customClass: {
        popup: "swal-custom-popup", // Custom class for styling
      },
      didOpen: () => {
          Swal.showLoading();
      }
  });

  // Attempt to sign in with email and password
  await signInWithEmailAndPassword(
      auth,
      email,
      arrayToHexString(encryptedUserPassword)
  );
  const user = auth.currentUser;
  if (user) {
    const docRef = doc(db, 'data', `${user.email}/private/settings`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const userSettings = docSnap.data();
      if (userSettings) {
        i18n.changeLanguage(userSettings.language || 'en');
      }
    } else {
      console.error("Can't retrieve language setting from Firebase!");
    }
  }
  // Close loading modal after successful sign-in
  Swal.close();

  // Set login data and update login state
  setLoginData(derivedKey.slice(64), iterations);
  setIsLoggedIn(true);

} catch (error) {
  // Close any open Swal modal before showing error
  Swal.close();

  let errorMessage;

  // Type guard to check if error is of type FirebaseError
  if (error instanceof Error) {
      if (error instanceof FirebaseError && error.code === 'auth/invalid-credential') {
          errorMessage = `
              <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('invalid_credentials_line0')}</p>
              <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('invalid_credentials_line1')}</p>
              <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('invalid_credentials_line2')}</p>`;
          Swal.fire({
              icon: "error",
              title: t('access_denied'),
              html: errorMessage,
              width: 600,
              padding: "3em",
              color: "var(--foreground)",
              background: "var(--card-background)",
              confirmButtonText: t('ok_button'),
              showConfirmButton: false, // Hide default confirm button
              footer: `<a class="btn_grd ${isRTL ? 'rtl' : 'ltr'}"><span>${t('ok_button')}</span></a>`,
              customClass: {
                  popup: "swal-custom-popup",
                  footer: "swal-custom-footer"
              },
              didOpen: () => {
                  const button = Swal.getFooter()?.querySelector('.btn_grd'); // Use optional chaining
                  if (button) {
                      button.addEventListener('click', () => Swal.close());
                  } else {
                      console.error("Button element not found!");
                  }
              }
          });
      } else {
          errorMessage = `
              <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
              <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`;
          console.log("Sign-in error:", error.message);
          Swal.fire({
            icon: "error",
            title: t('error_inscription'),
            html: errorMessage,
            width: 600,
            padding: "3em",
            color: "var(--foreground)",
            background: "var(--card-background)",
            confirmButtonText: t('ok_button'),
            showConfirmButton: false, // Hide default confirm button
            footer: `<a class="btn_grd ${isRTL ? 'rtl' : 'ltr'}"><span>${t('ok_button')}</span></a>`,
            customClass: {
                popup: "swal-custom-popup",
                footer: "swal-custom-footer"
            },
            didOpen: () => {
                const button = Swal.getFooter()?.querySelector('.btn_grd'); // Use optional chaining
                if (button) {
                    button.addEventListener('click', () => Swal.close());
                } else {
                    console.error("Button element not found!");
                }
            }
        });
      }
  } else {
      // Handle unexpected error types
      errorMessage = `
          <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('unexpected_error_occurred_line1')}</p>
          <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`;
      
      console.log("Unexpected error:", error);
      
      Swal.fire({
          icon: "error",
          title: t('error_inscription'),
          html: errorMessage,
          width: 600,
          padding: "3em",
          color: "var(--foreground)",
          background: "var(--card-background)",
          confirmButtonText: t('ok_button'),
          showConfirmButton: false, // Hide default confirm button
          footer: `<a class="btn_grd ${isRTL ? 'rtl' : 'ltr'}"><span>${t('ok_button')}</span></a>`,
          customClass: {
              popup: "swal-custom-popup",
              footer: "swal-custom-footer"
          },
          didOpen: () => {
              const button = Swal.getFooter()?.querySelector('.btn_grd'); // Use optional chaining
              if (button) {
                  button.addEventListener('click', () => Swal.close());
              } else {
                  console.error("Button element not found!");
              }
          }
      });
  }
}
};

  const handleSignUp = async () => {
    Swal.fire({
        title: t('deriving_keys'), // Use translation key for this message
        html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`, // Use translation key for this message
        color: "var(--foreground)",
        background: "var(--card-background)",
        width: 640,
        allowOutsideClick: false,
        customClass: {
          popup: "swal-custom-popup", // Custom class for styling
        },
        didOpen: () => {
            Swal.showLoading();
        }
    });
};

const handleSignUpContinue = async (email: string, password: string) => {

  const sha512EmailOutput = await sha512(email);
  const sha512EmailArray = hexStringToArray(sha512EmailOutput);
  const emailByteArray = new Uint8Array(sha512EmailArray);

  // Hash the email using Whirlpool to generate a robust salt
  const emailWhirlpoolHash = await whirlpool(emailByteArray);
  const hashedEmailSalt = new Uint8Array(hexStringToArray(emailWhirlpoolHash));

  // Hash the password using SHA-512
  const sha512PasswordOutput = await sha512(password);
  const sha512PasswordArray = hexStringToArray(sha512PasswordOutput);
  const passwordByteArray = new Uint8Array(sha512PasswordArray);

  // Hash the password result using Whirlpool
  const passwordWhirlpoolHash = await whirlpool(passwordByteArray);
  const hashedPassword = new Uint8Array(hexStringToArray(passwordWhirlpoolHash));

  // Use the entire hashed password for iterations (between 1100 and 1400)
  const iterationBytes = hashedPassword; // Use the full hashed password
  const derIterations = iterationBytes.reduce((acc, val) => acc + val, 0);
  const iterations = 1100 + (derIterations % (1400 - 1100 + 1)); // Ensure iterations are in range [1100,1400]

  // XOR the hashed email salt and hashed password to generate the final salt
  const saltLength = Math.min(hashedEmailSalt.length, hashedPassword.length); // Ensure lengths match
  const finalSalt = new Uint8Array(saltLength);
  for (let i = 0; i < saltLength; i++) {
    finalSalt[i] = hashedEmailSalt[i] ^ hashedPassword[i];
  }

  // Key derivation using Argon2id with password and final salt
  const derivedKey = await derive336BytesUsingArgon2id(password, finalSalt, iterations);

  // Extract user IDs and encryption key from derived key
  const userID1 = derivedKey.slice(0, 16);
  const userID2 = derivedKey.slice(16, 32);

  // Decrypt unencrypted password using XOR operation
  const unencryptedPassword = userID1.map((byte, index) => byte ^ userID2[index]);

  const userCredentialEncryptionKey = derivedKey.slice(32, 64);

  // Encrypt user password using Serpent-256 ECB mode
  const encryptedUserPassword = encryptSerpent256ECB(unencryptedPassword, userCredentialEncryptionKey);
  //console.log("email:" + uint8ArrayToString(encryptedemail));
  //console.log("Password:" + arrayToHexString(encryptedUserPassword));
  Swal.fire({
    title: t('creating_account'), // Use translation key for this message
    html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`, // Use translation key for this message
    color: "var(--foreground)",
    background: "var(--card-background)",
    width: 640,
    allowOutsideClick: false,
    customClass: {
      popup: "swal-custom-popup", // Custom class for styling
    },
    didOpen: () => {
        Swal.showLoading();
    }
});

let registrationSuccessful = false; // Flag to track registration success
const cut_iterations = parseInt((iterations / 9).toString(), 10);

try {
    await createUserWithEmailAndPassword(
        auth,
        email,
        arrayToHexString(encryptedUserPassword)
    );

    registrationSuccessful = true; // Set flag to true if registration succeeds

} catch (error) {
    let errorMessage;

    if (error instanceof FirebaseError) {
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = `<p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('email_taken_line1')}</p><p dir="${isRTL ? 'rtl' : 'ltr'}">${t('email_taken_line2')}</p>`;
        } else {
            errorMessage = `<p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p><p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`;
            console.log("User registration error:", error.message);
        }
    } else {
        // Handle unexpected error types
        errorMessage = `<p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('unexpected_error_occurred_line1')}</p><p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`;
        console.log("Unexpected error:", error);
    }

    Swal.fire({
        icon: "error",
        title: t('error_inscription'),
        html: errorMessage,
        width: 600,
        padding: "3em",
        color: "var(--foreground)",
        background: "var(--card-background)",
        confirmButtonText: t('ok_button'),
        showConfirmButton: false, // Hide default confirm button
        footer: `<a class="btn_grd ${isRTL ? 'rtl' : 'ltr'}"><span>${t('ok_button')}</span></a>`,
        customClass: {
            popup: "swal-custom-popup",
            footer: "swal-custom-footer"
        },
        didOpen: () => {
            const button = Swal.getFooter()?.querySelector('.btn_grd'); // Use optional chaining
            if (button) {
                button.addEventListener('click', () => Swal.close());
            } else {
                console.error("Button element not found!");
            }
        }
    });
    
    return; // Exit the function after displaying the error
}

// Show success message only if registration was successful
if (registrationSuccessful) {

    await signInWithEmailAndPassword(
      auth,
      email,
      arrayToHexString(encryptedUserPassword)
    );

    const user = auth.currentUser;
    try{
      if (user) {    
        const userSettings = {
          language: i18n.language,
        };
        const docRef = doc(collection(db, 'data'), `${user.email}/private/settings`);
        await setDoc(docRef, userSettings);
      }
    } catch{

    }

    try {
      Swal.fire({
        title: t('generating mlkem1024-key-pair'), // Use translation key for this message
        html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`, // Use translation key for this message
        color: "var(--foreground)",
        background: "var(--card-background)",
        width: 640,
        allowOutsideClick: false,
        customClass: {
          popup: "swal-custom-popup", // Custom class for styling
        },
        didOpen: () => {
            Swal.showLoading();
        }
    });
      const recipient = new MlKem1024();
      const [pkR, skR] = await recipient.generateKeyPair();
      //console.log("Generated Public Key:", pkR);
      //console.log("Generated Private Key:", skR);
      if (user) {        
        try {
          Swal.fire({
            title: t('uploading_mlkem_public_key_to_firebase'), // Use translation key for this message
            html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`, // Use translation key for this message
            color: "var(--foreground)",
            background: "var(--card-background)",
            width: 640,
            allowOutsideClick: false,
            customClass: {
              popup: "swal-custom-popup", // Custom class for styling
            },
            didOpen: () => {
                Swal.showLoading();
            }
        });
          // Convert public key to hex string
          const publicKey = btoa(String.fromCharCode(...pkR));
          
          // Create an object to store the public key
          const publicKeyData = {
            publicKey
          };
          
          // Create a document reference in Firestore with the new path
          const docRef = doc(collection(db, 'data'), `${user.email}/public/mlkem-public-key`);
          
          // Store the public key data in Firestore
          await setDoc(docRef, publicKeyData);
    
        } catch (error) {
          // Handle MLKEM key setup warning
          console.error("Failed to upload MLKEM public key to Firebase:", error);

          const warningMessage = `
            <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('account_created_successfully')}</p>
            <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('mlkem_key_setup_failed')}</p>
            <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('failed_to_upload_mlkem_public_key_to_firebase')}</p>
          `;
          
          Swal.fire({
            icon: "warning",
            title: t('warning'), // Set title to 'Warning'
            html: warningMessage,
            width: 600,
            padding: "3em",
            color: "var(--foreground)",
            background: "var(--card-background)",
            confirmButtonText: t('ok_button'),
            showConfirmButton: false, // Hide default confirm button
            footer: `<a class="btn_grd ${isRTL ? 'rtl' : 'ltr'}"><span>${t('ok_button')}</span></a>`,
            customClass: {
                popup: "swal-custom-popup",
                footer: "swal-custom-footer"
            },
            didOpen: () => {
                const button = Swal.getFooter()?.querySelector('.btn_grd'); // Use optional chaining
                if (button) {
                    button.addEventListener('click', () => Swal.close());
                } else {
                    console.error("Button element not found!");
                }
            }
          });
        }

      } else {
        // Handle case where user cannot log in
        console.error("Unable to log in to the newly created account. The MLKEM key setup has failed.");

        const warningMessage = `
          <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('account_created_successfully')}</p>
          <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('mlkem_key_setup_failed')}</p>
          <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('cant-log-in-in-to-newly-created-account')}</p>
        `;
        
        Swal.fire({
          icon: "warning",
          title: t('warning'), // Set title to 'Warning'
          html: warningMessage,
          width: 600,
          padding: "3em",
          color: "var(--foreground)",
          background: "var(--card-background)",
          confirmButtonText: t('ok_button'),
          showConfirmButton: false, // Hide default confirm button
          footer: `<a class="btn_grd ${isRTL ? 'rtl' : 'ltr'}"><span>${t('ok_button')}</span></a>`,
          customClass: {
              popup: "swal-custom-popup",
              footer: "swal-custom-footer"
          },
          didOpen: () => {
              const button = Swal.getFooter()?.querySelector('.btn_grd'); // Use optional chaining
              if (button) {
                  button.addEventListener('click', () => Swal.close());
              } else {
                  console.error("Button element not found!");
              }
          }
        });
      }

      if (user) {        
        try {
          Swal.fire({
            title: t('encrypting-mlkem-private-key'), // Use translation key for this message
            html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`, // Use translation key for this message
            color: "var(--foreground)",
            background: "var(--card-background)",
            width: 640,
            allowOutsideClick: false,
            customClass: {
              popup: "swal-custom-popup", // Custom class for styling
            },
            didOpen: () => {
                Swal.showLoading();
            }
        });

          const encryptedPrivateKey = await silentlyEncryptDataWithTwoCiphersCBCnoPadding(skR, derivedKey.slice(64), cut_iterations);
          // Decryption test
          //const [decryptedData, integrityFailed] = await silentlyDecryptDataWithTwoCiphersCBC(encryptedPrivateKey, derivedKey.slice(64), cut_iterations);
          //console.log("Decrypted Private Key:", decryptedData);
          //console.log("Integrity Failed:", integrityFailed);
          Swal.fire({
            title: t('uploading_mlkem_private_key_to_firebase'), // Use translation key for this message
            html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`, // Use translation key for this message
            color: "var(--foreground)",
            background: "var(--card-background)",
            width: 640,
            allowOutsideClick: false,
            customClass: {
              popup: "swal-custom-popup", // Custom class for styling
            },
            didOpen: () => {
                Swal.showLoading();
            }
        });
          const privateKey = btoa(String.fromCharCode(...encryptedPrivateKey));
          
          // Create an object to store the public key
          const privateKeyData = {
            privateKey
          };
          
          // Create a document reference in Firestore with the new path
          const docRef = doc(collection(db, 'data'), `${user.email}/private/encrypted/keyring/mlkem-private-key`);
          
          // Store the public key data in Firestore
          await setDoc(docRef, privateKeyData);
    
          await new Promise(resolve => setTimeout(resolve, 75));
          Swal.fire({
            icon: "success",
            title: t('account_created_successfully_top'), // Adjust translation key as needed
            html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t('you_can_sign_in_now')}</p>`, // Adjust translation key as needed
            width: 600,
            padding: "3em",
            color: "var(--foreground)",
            background: "var(--card-background)",
            confirmButtonText: t('ok_button'),
            showConfirmButton: false, // Hide default confirm button
            footer: `<a class="btn_grd ${isRTL ? 'rtl' : 'ltr'}"><span>${t('ok_button')}</span></a>`,
            customClass: {
                popup: "swal-custom-popup",
                footer: "swal-custom-footer"
            },
            didOpen: () => {
                const button = Swal.getFooter()?.querySelector('.btn_grd'); // Use optional chaining
                if (button) {
                    button.addEventListener('click', () => Swal.close());
                } else {
                    console.error("Button element not found!");
                }
            }
          });
          await new Promise(resolve => setTimeout(resolve, 75));
    
        } catch (error) {
          // Handle MLKEM key setup warning
          console.error("Failed to upload MLKEM public key to Firebase:", error);

          const warningMessage = `
            <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('account_created_successfully')}</p>
            <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('mlkem_key_setup_failed')}</p>
            <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('failed_to_upload_mlkem_public_key_to_firebase')}</p>
          `;
          
          Swal.fire({
            icon: "warning",
            title: t('warning'), // Set title to 'Warning'
            html: warningMessage,
            width: 600,
            padding: "3em",
            color: "var(--foreground)",
            background: "var(--card-background)",
            confirmButtonText: t('ok_button'),
            showConfirmButton: false, // Hide default confirm button
            footer: `<a class="btn_grd ${isRTL ? 'rtl' : 'ltr'}"><span>${t('ok_button')}</span></a>`,
            customClass: {
                popup: "swal-custom-popup",
                footer: "swal-custom-footer"
            },
            didOpen: () => {
                const button = Swal.getFooter()?.querySelector('.btn_grd'); // Use optional chaining
                if (button) {
                    button.addEventListener('click', () => Swal.close());
                } else {
                    console.error("Button element not found!");
                }
            }
          });

        }

      } else {
        // Handle case where user cannot log in
        console.error("Unable to log in to the newly created account. The MLKEM key setup has failed.");

        const warningMessage = `
          <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('account_created_successfully')}</p>
          <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('mlkem_key_setup_failed')}</p>
          <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('cant_log_in_in_to_newly_created_account')}</p>
        `;
        
        Swal.fire({
          icon: "warning",
          title: t('warning'), // Set title to 'Warning'
          html: warningMessage,
          width: 600,
          padding: "3em",
          color: "var(--foreground)",
          background: "var(--card-background)",
          confirmButtonText: t('ok_button'),
          showConfirmButton: false, // Hide default confirm button
          footer: `<a class="btn_grd ${isRTL ? 'rtl' : 'ltr'}"><span>${t('ok_button')}</span></a>`,
          customClass: {
              popup: "swal-custom-popup",
              footer: "swal-custom-footer"
          },
          didOpen: () => {
              const button = Swal.getFooter()?.querySelector('.btn_grd'); // Use optional chaining
              if (button) {
                  button.addEventListener('click', () => Swal.close());
              } else {
                  console.error("Button element not found!");
              }
          }
        });
      }
      auth.signOut();
    } catch (err) {
      // Handle unexpected errors
      console.error("MLKEM key setup error:", (err as Error).message);

      const warningMessage = `
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('account_created_successfully')}</p>
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('mlkem_key_setup_failed')}</p>
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>
      `;
      
      Swal.fire({
        icon: "warning",
        title: t('warning'), // Set title to 'Warning'
        html: warningMessage,
        width: 600,
        padding: "3em",
        color: "var(--foreground)",
        background: "var(--card-background)",
        confirmButtonText: t('ok_button'),
        showConfirmButton: false, // Hide default confirm button
        footer: `<a class="btn_grd ${isRTL ? 'rtl' : 'ltr'}"><span>${t('ok_button')}</span></a>`,
        customClass: {
            popup: "swal-custom-popup",
            footer: "swal-custom-footer"
        },
        didOpen: () => {
            const button = Swal.getFooter()?.querySelector('.btn_grd'); // Use optional chaining
            if (button) {
                button.addEventListener('click', () => Swal.close());
            } else {
                console.error("Button element not found!");
            }
        }
      });
    }
}
};

  const arrayToHexString = (byteArray: Uint8Array): string => {
    return Array.from(byteArray)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  };

  const hexStringToArray = (hexString: string): Uint8Array => {
    const matches = hexString.match(/.{1,2}/g);
    if (!matches) {
      throw new Error('Invalid hexadecimal string');
    }
    return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
  };


  // Main function to handle both sign-in and sign-up
  return async (mode: "signin" | "signup", email: string, password: string) => {
    // Validation: Check if email or password is empty
    if (mode === "signin"){
      handleSignIn(); // Call the first function

      // Call the second function after a delay of 100ms
      setTimeout(() => {
        handleSignInContinue(email, password);
      }, 100);
    }

    if (mode === "signup"){
      handleSignUp(); // Call the first function

      // Call the second function after a delay of 100ms
      setTimeout(() => {
        handleSignUpContinue(email, password);
      }, 100);
    }
  };
};

export default useSignInSignUpCryptography;
