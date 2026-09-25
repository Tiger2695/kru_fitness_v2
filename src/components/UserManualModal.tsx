import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Smartphone,
  CreditCard,
  Users,
  Calendar,
  CheckCircle,
  QrCode,
  Shield,
  HelpCircle,
  Printer,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<'install' | 'login' | 'members' | 'payments' | 'attendance' | 'faq'>('install');

  if (!isOpen) return null;

  const appLiveUrl = 'https://kru-fitness-v2.vercel.app/';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">Kru Fitness — User Manual</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full uppercase">
                  v2.0 Guide
                </span>
              </div>
              <p className="text-xs text-slate-400">Complete operating manual for Gym Owners & Staff</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
              title="Print Manual"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Guide</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick App Link Ribbon */}
        <div className="bg-teal-50 border-b border-teal-100 px-6 py-2.5 flex flex-wrap items-center justify-between text-xs text-teal-900 gap-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Official Web Link: <strong className="font-mono text-teal-950 font-bold">{appLiveUrl}</strong></span>
          </div>
          <a
            href={appLiveUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1 text-teal-700 hover:text-teal-900 font-semibold underline"
          >
            <span>Open in New Tab</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 bg-slate-50 px-4 sm:px-6 flex overflow-x-auto space-x-1 py-2 scrollbar-none">
          {[
            { id: 'install', label: '📱 App Install', icon: Smartphone },
            { id: 'login', label: '🔐 Login & OTP', icon: Shield },
            { id: 'members', label: '👥 Members', icon: Users },
            { id: 'payments', label: '💳 Payments & UPI', icon: CreditCard },
            { id: 'attendance', label: '🕒 Attendance', icon: QrCode },
            { id: 'faq', label: '❓ FAQ & Help', icon: HelpCircle },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body / Guide Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-sm leading-relaxed">
          {/* Section 1: Mobile App Install */}
          {activeSection === 'install' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Smartphone className="w-5 h-5 text-teal-600" />
                  <span>Phone par Play Store App ki tarah kaise Install karein?</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Kru Fitness ek modern Progressive Web App (PWA) hai. Isko bina kisi app store ke 5 second me phone par install kar sakte hain.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Android Steps */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center space-x-2 text-teal-800 font-bold text-sm">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs">🤖</span>
                    <span>Android Phone (Google Chrome)</span>
                  </div>
                  <ol className="text-xs space-y-2 text-slate-700 list-decimal list-inside leading-normal">
                    <li>Chrome mein <strong className="text-teal-900">{appLiveUrl}</strong> open karein.</li>
                    <li>Upar right corner mein <strong>3 dots (⋮)</strong> par click karein.</li>
                    <li>Menu mein <strong>"Install app"</strong> ya <strong>"Add to Home screen"</strong> dabayein.</li>
                    <li>Ab phone ke apps drawer me <strong>Kru Fitness</strong> ka logo ban jayega aur ye full-screen open hoga!</li>
                  </ol>
                </div>

                {/* iPhone Steps */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center space-x-2 text-teal-800 font-bold text-sm">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs">🍏</span>
                    <span>iPhone / iPad (Safari Browser)</span>
                  </div>
                  <ol className="text-xs space-y-2 text-slate-700 list-decimal list-inside leading-normal">
                    <li>Safari browser mein link open karein.</li>
                    <li>Neeche center mein <strong>Share button (arrow wala box)</strong> par click karein.</li>
                    <li>Scroll karke <strong>"Add to Home Screen"</strong> par tap karein.</li>
                    <li>Upar <strong>"Add"</strong> dabayein — iPhone screen par app icon ready ho jayega.</li>
                  </ol>
                </div>
              </div>

              {/* Desktop / Reception PC */}
              <div className="bg-teal-50/60 rounded-xl p-4 border border-teal-200 flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 font-bold text-xs">
                  💻
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-slate-900">Gym Reception Computer / Laptop par:</p>
                  <p>
                    Chrome ya Edge browser mein link open karein. Address bar ke right side mein <strong>"Install Kru Fitness"</strong> ka computer icon dikhega. Uspe click karke Desktop par shortcut bana lein taaki receptionist ek click me software open kar sake.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Login & OTP */}
          {activeSection === 'login' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-teal-600" />
                <span>Account Kaise Banayein aur Login Kaise Karein?</span>
              </h3>

              <div className="space-y-4">
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-xs">Option 1</span>
                    <span>6-Digit Email OTP / Magic Link (Sabse Aasan)</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Aapko password yaad rakhne ki zaroorat nahi hai. Apna email address enter karein aur <strong>"Send 6-Digit OTP"</strong> dabayein. Email par aane wale 6-digit code ko enter karein ya email ke link par click karke turant login ho jayein.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs">Option 2</span>
                    <span>Email & Password</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Agar aap direct password se kholna chahte hain, toh <strong>"🔑 Password"</strong> tab select karein. Apna email aur password daal kar instant Sign In karein.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Members */}
          {activeSection === 'members' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span>Naye Member ka Registration aur Plans</span>
              </h3>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Step 1: + Add Member par click karein:</strong>
                    <p className="text-slate-500 mt-0.5">Member ka Name, Mobile Number, Gender, aur Batch (Morning/Evening) enter karein.</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Step 2: Plan Select karein:</strong>
                    <p className="text-slate-500 mt-0.5">1 Mahina, 3 Mahina, 6 Mahina ya 1 Saal ka membership plan chunein. Expiry date automatically calculate ho jayegi.</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Step 3: WhatsApp Welcome Message:</strong>
                    <p className="text-slate-500 mt-0.5">Member add hote hi ek click mein unke phone par gym ka official welcome message aur fee receipt send ho jata hai.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Payments & UPI */}
          {activeSection === 'payments' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-teal-600" />
                <span>Fees Collection aur Dynamic UPI QR Code</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-200 text-xs space-y-2">
                  <div className="font-bold text-teal-900 flex items-center space-x-1.5">
                    <QrCode className="w-4 h-4 text-teal-700" />
                    <span>Instant UPI QR Code</span>
                  </div>
                  <p className="text-slate-600">
                    Aapke gym ki UPI ID par exact fee amount ka QR code screen par dikh jata hai. Member GPay, PhonePe ya Paytm se scan karke direct aapke bank account me transfer kar sakta hai.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <Printer className="w-4 h-4 text-slate-700" />
                    <span>Digital Bill & WhatsApp Receipt</span>
                  </div>
                  <p className="text-slate-600">
                    Payment enter karte hi GST/Gym bill generate ho jata hai. Aap thermal printer se print kar sakte hain ya WhatsApp par receipt link send kar sakte hain.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Attendance */}
          {activeSection === 'attendance' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-teal-600" />
                <span>Daily Member Attendance & QR Check-in</span>
              </h3>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="text-slate-900">1-Second Fast Check-In:</strong>
                  <p className="text-slate-500 mt-1">
                    Attendance tab mein member ka naam ya mobile number search karein aur "Check In" button dabayein. Time aur date automatically record ho jati hai.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="text-slate-900">Counter QR Code:</strong>
                  <p className="text-slate-500 mt-1">
                    Gym entrance par QR code display karein jise members scan karke attendance mark kar sakein.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: FAQ */}
          {activeSection === 'faq' && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs text-slate-700">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">Q: Kya phone aur laptop dono par ek sath chalega?</div>
                <p className="text-slate-600">Haan, receptionist counter ke computer par chala sakta hai aur gym owner apne mobile par real-time reports dekh sakta hai.</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">Q: Agar member chhutti ya bimar ho jaye toh membership hold kaise karein?</div>
                <p className="text-slate-600">Member profile open karein aur "Hold Membership" par click karein. Jitne din wo nahi aayega utne din uski expiry date aage badh jayegi!</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">Q: Kya WhatsApp reminders ke liye phone number save karna padega?</div>
                <p className="text-slate-600">Bilkul nahi! Kru Fitness direct WhatsApp API se chalta hai, bina number save kiye ek click me WhatsApp open ho jata hai.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between text-xs text-slate-500">
          <span>Kru Fitness Cloud OS • Designed for high-performance gyms</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
