export function planLimitError(language: string) {
  return language === "bn"
    ? { success: false, code: 402, message: "আপনার ভিডিও লিমিট শেষ। Agency প্ল্যানে আপগ্রেড করুন।" }
    : { success: false, code: 402, message: "Video limit reached. Upgrade to Agency plan." };
}

export function serverError(language: string) {
  return language === "bn"
    ? { success: false, code: 500, message: "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।" }
    : { success: false, code: 500, message: "Something went wrong. Please try again." };
}

export function aiError(language: string) {
  return language === "bn"
    ? { success: false, code: 503, message: "AI এখন ব্যস্ত। একটু পরে চেষ্টা করুন।" }
    : { success: false, code: 503, message: "AI is busy right now. Please try again shortly." };
}

export function unauthorizedError(language: string) {
  return language === "bn"
    ? { success: false, code: 401, message: "অনুমতি নেই। আবার লগইন করুন।" }
    : { success: false, code: 401, message: "Unauthorized. Please log in again." };
}
