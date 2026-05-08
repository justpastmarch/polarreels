import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebaseAdmin";
import type { PersistenceStatus, PolarUser, ReelItem, ReelMetricSnapshot, TrackedAccount } from "@/types/reel";

export const sanitizeDocId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
const stripUndefined = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

const toTrackedAccount = (id: string, data: DocumentData): TrackedAccount => ({
  creatorId: id,
  accountLabel: typeof data.accountLabel === "string" ? data.accountLabel : id,
  updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
  lastScrapedAt: typeof data.lastScrapedAt === "string" ? data.lastScrapedAt : "",
  reelCount: typeof data.reelCount === "number" ? data.reelCount : 0,
  trackingEnabled: data.trackingEnabled !== false,
  favoriteAddedAt: typeof data.favoriteAddedAt === "string" ? data.favoriteAddedAt : undefined,
});

export const saveAnalysisToFirestore = async ({
  accountLabel,
  reels,
}: {
  accountLabel: string;
  reels: ReelItem[];
}): Promise<PersistenceStatus> => {
  if (!isFirebaseConfigured()) {
    return {
      enabled: false,
      saved: false,
      message: "Firebase 환경변수가 없어 Firestore 저장은 건너뛰었습니다.",
    };
  }

  const db = getFirebaseDb();
  if (!db) {
    return {
      enabled: false,
      saved: false,
      message: "Firestore 초기화에 실패했습니다.",
    };
  }

  const creatorId = sanitizeDocId(accountLabel.replace(/^@/, ""));
  const creatorRef = db.collection("creators").doc(creatorId);
  const now = new Date().toISOString();

  try {
    await creatorRef.set(
      {
        accountLabel,
        updatedAt: now,
        lastScrapedAt: now,
        reelCount: reels.length,
        trackingEnabled: true,
      },
      { merge: true },
    );

    const batch = db.batch();

    reels.forEach((reel) => {
      const reelId = sanitizeDocId(reel.id);
      const reelRef = creatorRef.collection("reels").doc(reelId);
      const snapshotRef = reelRef.collection("metricSnapshots").doc(now);
      const snapshot: ReelMetricSnapshot = {
        reelId: reel.id,
        capturedAt: now,
        views: reel.views,
        likes: reel.likes,
        comments: reel.comments,
      };

      batch.set(
        reelRef,
        {
          ...stripUndefined(reel),
          updatedAt: now,
          firstSeenAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      batch.set(snapshotRef, snapshot, { merge: true });
    });

    await batch.commit();

    return {
      enabled: true,
      saved: true,
      message: `Firestore에 ${reels.length}개 Reel과 metric snapshot을 저장했습니다.`,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      enabled: true,
      saved: false,
      message: `Firestore 저장 중 오류가 발생했습니다: ${reason}`,
    };
  }
};

export const getTrackedAccountsFromFirestore = async (): Promise<TrackedAccount[]> => {
  if (!isFirebaseConfigured()) return [];

  const db = getFirebaseDb();
  if (!db) return [];

  const snapshot = await db
    .collection("creators")
    .orderBy("updatedAt", "desc")
    .limit(8)
    .get();

  return snapshot.docs
    .filter((doc) => doc.data().trackingEnabled !== false)
    .map((doc) => toTrackedAccount(doc.id, doc.data()));
};

export const getFavoriteAccountsFromFirestore = async (userId: string): Promise<TrackedAccount[]> => {
  if (!isFirebaseConfigured()) return [];

  const db = getFirebaseDb();
  if (!db) return [];

  const userDocId = sanitizeDocId(userId);
  const snapshot = await db
    .collection("users")
    .doc(userDocId)
    .collection("favoriteAccounts")
    .orderBy("updatedAt", "desc")
    .limit(12)
    .get();

  return snapshot.docs.map((doc) => toTrackedAccount(doc.id, doc.data()));
};

export const upsertUserInFirestore = async (label: string): Promise<PolarUser> => {
  const id = sanitizeDocId(label.trim().toLowerCase());
  const user: PolarUser = { id, label: label.trim() };

  if (!isFirebaseConfigured()) return user;

  const db = getFirebaseDb();
  if (!db) return user;

  const now = new Date().toISOString();
  await db.collection("users").doc(id).set(
    {
      id,
      label: user.label,
      updatedAt: now,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return user;
};

export const saveFavoriteAccountToFirestore = async (userId: string, accountLabel: string) => {
  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();
  if (!db) return;

  const userDocId = sanitizeDocId(userId);
  const creatorDocId = sanitizeDocId(accountLabel.replace(/^@/, ""));
  const creatorSnapshot = await db.collection("creators").doc(creatorDocId).get();
  const creatorData = creatorSnapshot.data() ?? {};
  const now = new Date().toISOString();

  await db
    .collection("users")
    .doc(userDocId)
    .collection("favoriteAccounts")
    .doc(creatorDocId)
    .set(
      {
        creatorId: creatorDocId,
        accountLabel,
        updatedAt: now,
        lastScrapedAt: typeof creatorData.lastScrapedAt === "string" ? creatorData.lastScrapedAt : now,
        reelCount: typeof creatorData.reelCount === "number" ? creatorData.reelCount : 0,
        trackingEnabled: true,
        favoriteAddedAt: now,
      },
      { merge: true },
    );
};

export const removeFavoriteAccountFromFirestore = async (userId: string, accountLabel: string) => {
  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();
  if (!db) return;

  const userDocId = sanitizeDocId(userId);
  const creatorDocId = sanitizeDocId(accountLabel.replace(/^@/, ""));

  await db.collection("users").doc(userDocId).collection("favoriteAccounts").doc(creatorDocId).delete();
};
