"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Search,
  Share2,
  Megaphone,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { SiteSettings } from "@/lib/services/settings.service";
import { GeneralSettingsTab } from "./GeneralSettingsTab";
import { SeoSettingsTab } from "./SeoSettingsTab";
import { SocialSettingsTab } from "./SocialSettingsTab";
import { AnnouncementSettingsTab } from "./AnnouncementSettingsTab";

interface SiteSettingsPageProps {
  initialSettings: SiteSettings;
}

type TabType = "general" | "seo" | "social" | "announcement";

export function SiteSettingsPage({ initialSettings }: SiteSettingsPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("general");

  // Form State
  const [siteName, setSiteName] = useState(initialSettings.siteName || "");
  const [logoUrl, setLogoUrl] = useState(initialSettings.logoUrl || "");
  const [faviconUrl, setFaviconUrl] = useState(initialSettings.faviconUrl || "");
  const [footerText, setFooterText] = useState(initialSettings.footerText || "");

  const [seoDefaultTitle, setSeoDefaultTitle] = useState(
    initialSettings.seoDefaultTitle || ""
  );
  const [seoDefaultDesc, setSeoDefaultDesc] = useState(
    initialSettings.seoDefaultDesc || ""
  );
  const [seoOgImage, setSeoOgImage] = useState(initialSettings.seoOgImage || "");

  const [twitter, setTwitter] = useState(initialSettings.social?.twitter || "");
  const [linkedin, setLinkedin] = useState(initialSettings.social?.linkedin || "");
  const [youtube, setYoutube] = useState(initialSettings.social?.youtube || "");
  const [instagram, setInstagram] = useState(initialSettings.social?.instagram || "");

  const [announcementText, setAnnouncementText] = useState(
    initialSettings.announcement?.text || ""
  );
  const [announcementActive, setAnnouncementActive] = useState(
    initialSettings.announcement?.active || false
  );

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSaveAll = async () => {
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    const payload = {
      siteName: siteName.trim(),
      logoUrl: logoUrl.trim() || null,
      faviconUrl: faviconUrl.trim() || null,
      footerText: footerText.trim(),
      seoDefaultTitle: seoDefaultTitle.trim(),
      seoDefaultDesc: seoDefaultDesc.trim(),
      seoOgImage: seoOgImage.trim() || null,
      social: {
        twitter: twitter.trim() || null,
        linkedin: linkedin.trim() || null,
        youtube: youtube.trim() || null,
        instagram: instagram.trim() || null,
      },
      announcement: {
        text: announcementText.trim(),
        active: announcementActive,
      },
    };

    try {
      const res = await fetch("/api/cms/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update settings");
      }

      setSuccessMsg("Global site settings saved successfully!");
      router.refresh();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{ id: TabType; label: string; icon: React.ElementType }> = [
    { id: "general", label: "General & Brand", icon: Globe },
    { id: "seo", label: "SEO & Social Preview", icon: Search },
    { id: "social", label: "Social Channels", icon: Share2 },
    { id: "announcement", label: "Announcement Banner", icon: Megaphone },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header & Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Global Site Settings</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure site-wide branding, SEO meta defaults, social profiles, and announcement banners.
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSaveAll}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all active:scale-[0.98] self-start sm:self-auto"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? "Saving Changes..." : "Save All Settings"}</span>
        </button>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
      <div className="pt-2">
        {activeTab === "general" && (
          <GeneralSettingsTab
            siteName={siteName}
            setSiteName={setSiteName}
            logoUrl={logoUrl}
            setLogoUrl={setLogoUrl}
            faviconUrl={faviconUrl}
            setFaviconUrl={setFaviconUrl}
            footerText={footerText}
            setFooterText={setFooterText}
          />
        )}

        {activeTab === "seo" && (
          <SeoSettingsTab
            seoDefaultTitle={seoDefaultTitle}
            setSeoDefaultTitle={setSeoDefaultTitle}
            seoDefaultDesc={seoDefaultDesc}
            setSeoDefaultDesc={setSeoDefaultDesc}
            seoOgImage={seoOgImage}
            setSeoOgImage={setSeoOgImage}
            siteName={siteName}
          />
        )}

        {activeTab === "social" && (
          <SocialSettingsTab
            twitter={twitter}
            setTwitter={setTwitter}
            linkedin={linkedin}
            setLinkedin={setLinkedin}
            youtube={youtube}
            setYoutube={setYoutube}
            instagram={instagram}
            setInstagram={setInstagram}
          />
        )}

        {activeTab === "announcement" && (
          <AnnouncementSettingsTab
            announcementText={announcementText}
            setAnnouncementText={setAnnouncementText}
            announcementActive={announcementActive}
            setAnnouncementActive={setAnnouncementActive}
          />
        )}
      </div>
    </div>
  );
}
