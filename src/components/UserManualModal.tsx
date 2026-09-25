import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Smartphone,
  CreditCard,
  Users,
  CheckCircle,
  QrCode,
  Shield,
  HelpCircle,
  Printer,
  ExternalLink,
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
                  Operating Guide
                </span>
              </div>
              <p className="text-xs text-slate-400">Complete guide for Gym Owners, Managers, and Reception Staff</p>
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
            { id: 'install', label: '📱 App Installation', icon: Smartphone },
            { id: 'login', label: '🔐 Login & Security', icon: Shield },
            { id: 'members', label: '👥 Members & Plans', icon: Users },
            { id: 'payments', label: '💳 Payments & UPI', icon: CreditCard },
            { id: 'attendance', label: '🕒 Attendance & Check-in', icon: QrCode },
            { id: 'faq', label: '❓ FAQ & Support', icon: HelpCircle },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-xs'
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
                  <span>How to Install Kru Fitness on Phones and Tablets</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Kru Fitness is built as a Progressive Web App (PWA). You can install it on your Android phone, iPhone, iPad, or desktop in 5 seconds without searching app stores.
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
                    <li>Open <strong className="text-teal-900">{appLiveUrl}</strong> in Google Chrome.</li>
                    <li>Tap the <strong>three dots (⋮)</strong> in the top-right corner.</li>
                    <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                    <li>Kru Fitness will now appear in your apps list with full-screen native performance!</li>
                  </ol>
                </div>

                {/* iPhone Steps */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center space-x-2 text-teal-800 font-bold text-sm">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs">🍏</span>
                    <span>iPhone / iPad (Safari Browser)</span>
                  </div>
                  <ol className="text-xs space-y-2 text-slate-700 list-decimal list-inside leading-normal">
                    <li>Open the link in the <strong>Safari</strong> browser.</li>
                    <li>Tap the <strong>Share button</strong> (square with arrow pointing up) at the bottom.</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                    <li>Tap <strong>"Add"</strong> in the top-right corner — the app icon will appear on your home screen.</li>
                  </ol>
                </div>
              </div>

              {/* Desktop / Reception PC */}
              <div className="bg-teal-50/60 rounded-xl p-4 border border-teal-200 flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 font-bold text-xs">
                  💻
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-slate-900">Gym Reception Desktop / Laptop:</p>
                  <p>
                    Open the link in Google Chrome or Microsoft Edge. Click the <strong>"Install Kru Fitness"</strong> icon on the right side of the address bar to create a desktop shortcut for quick 1-click launch by your staff.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Login & Password */}
          {activeSection === 'login' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-teal-600" />
                <span>Account Registration and Authentication</span>
              </h3>

              <div className="space-y-4">
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-xs">Sign In</span>
                    <span>Email & Password Authentication</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Sign in with your registered email and password to instantly access your gym workspace. The session remains securely remembered across app restarts.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs">Create Account</span>
                    <span>New Gym Owner Onboarding</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Enter your name, email, and choose a secure password (minimum 6 characters). Upon registration, you are immediately routed to configure your gym details and membership packages.
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
                <span>Member Registration, Packages & Renewals</span>
              </h3>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Step 1: Click + Add Member</strong>
                    <p className="text-slate-500 mt-0.5">Enter member details: Full Name, 10-digit mobile number, gender, and personal training options if applicable.</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Step 2: Assign Membership Plan</strong>
                    <p className="text-slate-500 mt-0.5">Select Monthly, Quarterly, Semi-Annual, or Annual plan. The system automatically computes the precise expiry date.</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Step 3: Instant WhatsApp Welcome Message</strong>
                    <p className="text-slate-500 mt-0.5">Once registered, send an official gym welcome message and digital receipt to the member's WhatsApp in one tap.</p>
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
                <span>Fee Collection & Dynamic UPI QR Codes</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-200 text-xs space-y-2">
                  <div className="font-bold text-teal-900 flex items-center space-x-1.5">
                    <QrCode className="w-4 h-4 text-teal-700" />
                    <span>Dynamic UPI QR Code</span>
                  </div>
                  <p className="text-slate-600">
                    Display an on-screen QR code pre-filled with the exact fee amount and your gym UPI ID. Members can scan with Google Pay, PhonePe, or Paytm for direct bank settlement.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <Printer className="w-4 h-4 text-slate-700" />
                    <span>Receipts & Thermal Printing</span>
                  </div>
                  <p className="text-slate-600">
                    Immediately print thermal receipts or generate shareable digital payment confirmation links directly over WhatsApp.
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
                <span>Daily Attendance & Check-in Logging</span>
              </h3>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="text-slate-900">Fast 1-Click Check-in:</strong>
                  <p className="text-slate-500 mt-1">
                    Search the member by name or mobile number and click "Check In". The check-in timestamp and membership validity status are logged instantly.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="text-slate-900">Counter QR Code:</strong>
                  <p className="text-slate-500 mt-1">
                    Display the QR code at your reception counter so members can self check-in seamlessly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: FAQ */}
          {activeSection === 'faq' && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs text-slate-700">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">Can multiple devices operate simultaneously?</div>
                <p className="text-slate-600">Yes. The reception desktop, manager's laptop, and gym owner's phone stay synchronized in real time via live cloud database synchronization.</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">How do I hold or pause a member's package?</div>
                <p className="text-slate-600">Open the member's profile and click "Hold Membership". Specify the hold dates, and the system automatically extends their expiry date by the corresponding number of days.</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">Do I need to save member numbers to send WhatsApp reminders?</div>
                <p className="text-slate-600">No. Kru Fitness uses direct WhatsApp integration to launch personalized message templates without requiring numbers to be saved in your contact book.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between text-xs text-slate-500">
          <span>Kru Fitness Cloud OS • Built for modern fitness centers</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
