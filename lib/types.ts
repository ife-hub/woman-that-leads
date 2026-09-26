export interface RsvpPayload {
  title: "Mr." | "Miss" | "Mrs.";
  fullName: string;
  email: string;
  phone: string;
  phoneIsWhatsapp: "Yes" | "No";
  whatsapp?: string;
  age: string;
  isStudent: "Yes" | "No";
  level?:
    | "100 Level"
    | "200 Level"
    | "300 Level"
    | "400 Level"
    | "500 Level"
    | "Postgraduate"
    | "Other";
  levelOther?: string;
  courseOfStudy?: string;
  institution?: string;
  comingWithSomeone: "Yes" | "No";
  companionCount?: string;
  howHeard:
    | "WhatsApp"
    | "Instagram"
    | "Facebook"
    | "Friend/Family"
    | "Church"
    | "Campus fellowship"
    | "Other";
  howHeardOther?: string;
  wantsUpdates: "Yes" | "No";
}

export interface RsvpResponse {
  ok: boolean;
  qrDataUrl?: string;
  error?: string;
}