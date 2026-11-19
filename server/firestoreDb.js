/**
 * Front Desk AI — Cloud Firestore Engine
 * Connects to Google Cloud Firestore native database
 */

import { Firestore } from "@google-cloud/firestore";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || "project-cf853977-5c9b-4d28-91d";
const DATABASE_ID = "(default)";

// In Cloud Run, K_SERVICE is always set by the runtime
const IS_CLOUD_RUN = Boolean(process.env.K_SERVICE || process.env.K_REVISION || process.env.GOOGLE_APPLICATION_CREDENTIALS);

// Local fallback file store for local developer workstation
const LOCAL_FALLBACK_FILE = path.resolve(__dirname, "../data/local_users_db.json");

let firestoreInstance = null;

function getDb() {
  if (firestoreInstance) return firestoreInstance;

  if (IS_CLOUD_RUN) {
    try {
      firestoreInstance = new Firestore({
        projectId: PROJECT_ID,
        databaseId: DATABASE_ID
      });
      console.log(`[Firestore] Initialized Google Cloud client in Cloud Run (Project: ${PROJECT_ID})`);
      return firestoreInstance;
    } catch (err) {
      console.warn("[Firestore] Cloud client init error:", err.message);
    }
  }

  return null;
}

// Local store helpers
function ensureLocalStore() {
  const dir = path.dirname(LOCAL_FALLBACK_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_FALLBACK_FILE)) {
    fs.writeFileSync(LOCAL_FALLBACK_FILE, JSON.stringify([]), "utf8");
  }
}

function readLocalUsers() {
  ensureLocalStore();
  try {
    const raw = fs.readFileSync(LOCAL_FALLBACK_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function writeLocalUsers(users) {
  ensureLocalStore();
  fs.writeFileSync(LOCAL_FALLBACK_FILE, JSON.stringify(users, null, 2), "utf8");
}

/**
 * Get user by Email
 */
export async function getUserByEmail(email) {
  const cleanEmail = email.trim().toLowerCase();
  const db = getDb();

  if (db) {
    try {
      const snap = await db
        .collection("users")
        .where("email", "==", cleanEmail)
        .limit(1)
        .get();

      if (snap.empty) return null;
      const doc = snap.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (err) {
      console.warn("[Firestore] Query error:", err.message);
    }
  }

  // Local fallback
  const local = readLocalUsers();
  return local.find((u) => u.email.toLowerCase() === cleanEmail) || null;
}

/**
 * Get user by Phone number
 */
export async function getUserByPhone(phone) {
  if (!phone) return null;
  const cleanPhone = phone.trim();
  const digits = cleanPhone.replace(/\D/g, "");
  const db = getDb();

  if (db) {
    try {
      let snap = await db
        .collection("users")
        .where("phone", "==", cleanPhone)
        .limit(1)
        .get();

      if (!snap.empty) {
        const doc = snap.docs[0];
        return { id: doc.id, ...doc.data() };
      }

      if (digits.length >= 10) {
        const last10 = digits.slice(-10);
        snap = await db
          .collection("users")
          .where("phone", "==", `+91${last10}`)
          .limit(1)
          .get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          return { id: doc.id, ...doc.data() };
        }

        snap = await db
          .collection("users")
          .where("phone", "==", last10)
          .limit(1)
          .get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          return { id: doc.id, ...doc.data() };
        }

        snap = await db
          .collection("users")
          .where("email", "==", `91${last10}@phone.frontdeskai.shop`)
          .limit(1)
          .get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          return { id: doc.id, ...doc.data() };
        }
      }
    } catch (err) {
      console.warn("[Firestore] Query by phone error:", err.message);
    }
  }

  // Local fallback
  const local = readLocalUsers();
  return (
    local.find((u) => {
      if (u.phone) {
        const uDigits = u.phone.replace(/\D/g, "");
        if (digits.length >= 10 && uDigits.endsWith(digits.slice(-10))) return true;
        if (u.phone === cleanPhone) return true;
      }
      if (digits.length >= 10 && u.email && u.email.includes(`${digits.slice(-10)}@phone.`)) return true;
      return false;
    }) || null
  );
}

/**
 * Get user by Document ID
 */
export async function getUserById(id) {
  if (!id) return null;
  const db = getDb();

  if (db) {
    try {
      const doc = await db.collection("users").doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (err) {
      console.warn("[Firestore] Get doc error:", err.message);
    }
  }

  const local = readLocalUsers();
  return local.find((u) => u.id === id) || null;
}

/**
 * Create a new user in Firestore
 */
export async function createUser(userObj) {
  const db = getDb();

  if (db) {
    try {
      await db.collection("users").doc(userObj.id).set(userObj);
      console.log(`[Firestore] User ${userObj.id} saved in Firestore`);
      return userObj;
    } catch (err) {
      console.warn("[Firestore] Create user error:", err.message);
    }
  }

  const local = readLocalUsers();
  local.push(userObj);
  writeLocalUsers(local);
  return userObj;
}

/**
 * Update arbitrary user fields (password, emailVerified, phone, phoneVerified, etc.)
 */
export async function updateUser(id, updates) {
  const updatePayload = {
    ...updates,
    updatedAt: new Date().toISOString()
  };
  const db = getDb();

  if (db) {
    try {
      await db.collection("users").doc(id).update(updatePayload);
      console.log(`[Firestore] User ${id} updated:`, Object.keys(updates));
      return { id, ...updatePayload };
    } catch (err) {
      console.warn("[Firestore] Update user error:", err.message);
    }
  }

  const local = readLocalUsers();
  const idx = local.findIndex((u) => u.id === id);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...updatePayload };
    writeLocalUsers(local);
    return local[idx];
  }
  return null;
}

/**
 * Update user profile
 */
export async function updateUserProfile(id, profileData) {
  const updatePayload = {
    profile: profileData,
    updatedAt: new Date().toISOString()
  };
  const db = getDb();

  if (db) {
    try {
      await db.collection("users").doc(id).update(updatePayload);
      console.log(`[Firestore] Profile updated for user ${id}`);
      return updatePayload.profile;
    } catch (err) {
      console.warn("[Firestore] Update profile error:", err.message);
    }
  }

  const local = readLocalUsers();
  const idx = local.findIndex((u) => u.id === id);
  if (idx !== -1) {
    local[idx].profile = profileData;
    local[idx].updatedAt = updatePayload.updatedAt;
    writeLocalUsers(local);
  }
  return profileData;
}

/**
 * Clear user profile
 */
export async function clearUserProfile(id) {
  const updatePayload = {
    profile: null,
    updatedAt: new Date().toISOString()
  };
  const db = getDb();

  if (db) {
    try {
      await db.collection("users").doc(id).update(updatePayload);
      console.log(`[Firestore] Profile cleared for user ${id}`);
      return true;
    } catch (err) {
      console.warn("[Firestore] Clear profile error:", err.message);
    }
  }

  const local = readLocalUsers();
  const idx = local.findIndex((u) => u.id === id);
  if (idx !== -1) {
    local[idx].profile = null;
    local[idx].updatedAt = updatePayload.updatedAt;
    writeLocalUsers(local);
  }
  return true;
}

/**
 * Permanently delete user account (DPDPA 2023 compliance)
 */
export async function deleteUserAccount(id) {
  const db = getDb();

  if (db) {
    try {
      await db.collection("users").doc(id).delete();
      console.log(`[Firestore] User ${id} permanently deleted`);
      return true;
    } catch (err) {
      console.warn("[Firestore] Delete user error:", err.message);
    }
  }

  const local = readLocalUsers();
  const filtered = local.filter((u) => u.id !== id);
  writeLocalUsers(filtered);
  return true;
}
