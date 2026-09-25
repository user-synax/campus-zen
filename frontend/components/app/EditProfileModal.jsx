"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Github, Twitter, Linkedin, Instagram, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export function EditProfileModal({ open, onClose, user, onSaved }) {
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [college, setCollege] = useState(user?.college || "");
  const [course, setCourse] = useState(user?.course || "");
  const [academicYear, setAcademicYear] = useState(user?.academicYear || "");
  const [github, setGithub] = useState(user?.socialLinks?.github || "");
  const [twitter, setTwitter] = useState(user?.socialLinks?.twitter || "");
  const [linkedin, setLinkedin] = useState(user?.socialLinks?.linkedin || "");
  const [instagram, setInstagram] = useState(user?.socialLinks?.instagram || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);
  const modalRef = useRef(null);
  const fileRef = useRef(null);

  // sync when user changes
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setBio(user.bio || "");
      setCollege(user.college || "");
      setCourse(user.course || "");
      setAcademicYear(user.academicYear || "");
      setGithub(user.socialLinks?.github || "");
      setTwitter(user.socialLinks?.twitter || "");
      setLinkedin(user.socialLinks?.linkedin || "");
      setInstagram(user.socialLinks?.instagram || "");
      setAvatarPreview(user.avatarUrl || null);
      setAvatarFile(null);
    }
  }, [user]);

  // open/close animation
  useEffect(() => {
    if (open) {
      setShow(true);
      setClosing(false);
      // lock scroll
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => {
        modalRef.current?.classList.add("is-open");
      }, 10);
      return () => clearTimeout(t);
    } else if (show) {
      modalRef.current?.classList.remove("is-open");
      modalRef.current?.classList.add("is-closing");
      setClosing(true);
      const t = setTimeout(() => {
        setShow(false);
        setClosing(false);
        document.body.style.overflow = "";
      }, 160);
      return () => clearTimeout(t);
    }
  }, [open, show]);

  // escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      setError("Image must be under 4MB");
      return;
    }
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
    setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Full name must be at least 2 characters");
      return;
    }
    if (bio && bio.length > 160) {
      setError("Bio must be 160 characters or less");
      return;
    }
    if (github && !/^[a-zA-Z0-9-]{1,39}$/.test(github.trim())) {
      setError("Invalid GitHub username");
      return;
    }
    setLoading(true);
    try {
      let avatarUrl = user?.avatarUrl || null;
      if (avatarFile) {
        try {
          const up = await api.uploadAvatar(avatarFile);
          avatarUrl = up.data?.user?.avatarUrl || avatarUrl;
        } catch (e) {
          const msg = e.data?.message || e.message || "Avatar upload failed";
          if (e.status === 503) {
            setError(`${msg} — add APPWRITE_* env on backend (see backend/.env.example)`);
          } else {
            setError(msg);
          }
          setLoading(false);
          return;
        }
      }

      const payload = {
        fullName: fullName.trim(),
        bio: bio.trim() || null,
        college: college.trim() || null,
        course: course.trim() || null,
        academicYear: academicYear || null,
        // avatarUrl already updated via /me/avatar if file was uploaded; include only if no file or to keep consistent
        ...(avatarFile ? {} : { avatarUrl: avatarUrl || null }),
        socialLinks: {
          github: github.trim() || null,
          twitter: twitter.trim().replace(/^@/, "") || null,
          linkedin: linkedin.trim() || null,
          instagram: instagram.trim().replace(/^@/, "") || null,
        },
      };
      // if avatar was uploaded, payload already has it via backend, no need to send again
      const res = await api.updateMe(payload);
      // if avatar was uploaded, the latest user already has it; prefer res from updateMe, but merge preview
      const finalUser = res.data?.user || user;
      // if we uploaded avatar, finalUser should already have new avatarUrl; ensure it reflects
      if (avatarUrl && avatarFile) finalUser.avatarUrl = avatarUrl;
      onSaved?.(finalUser);
      onClose?.();
    } catch (err) {
      const data = err.data || {};
      setError(data.message || err.message || "Failed to save");
      if (data.details) {
        const msg = data.details.map((d) => d.message).join(", ");
        if (msg) setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!show && !open) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] border-0 p-0 m-0"
        tabIndex={-1}
      />
      {/* modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        className="t-modal relative w-full sm:max-w-[560px] max-h-[92dvh] sm:max-h-[88dvh] overflow-hidden rounded-t-[20px] sm:rounded-[20px] border border-[var(--cz-border)] bg-[var(--cz-surface)] shadow-[0_16px_48px_rgba(0,0,0,0.5)] flex flex-col"
      >
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--cz-border)] bg-[var(--cz-surface)] px-4 sm:px-5 h-[56px] shrink-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Edit profile</h2>
          <button
            onClick={onClose}
            className="grid place-items-center h-8 w-8 rounded-[10px] hover:bg-[rgba(255,206,173,0.08)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-6">
          {error ? (
            <div className="rounded-[10px] border border-[var(--cz-error)]/20 bg-[rgba(255,90,106,0.08)] px-3 py-2.5 text-[13px] leading-[18px] text-[var(--cz-error)]">{error}</div>
          ) : null}

          {/* avatar */}
          <div className="flex items-center gap-4">
            <span className="relative grid place-items-center h-[72px] w-[72px] rounded-full overflow-hidden border-2 border-[var(--cz-border)] bg-[var(--cz-bg)] shrink-0">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="avatar preview" className="h-full w-full object-cover" />
              ) : (
                <span className="grid place-items-center h-full w-full bg-[var(--cz-muted)] text-white font-semibold text-[20px]">
                  {(fullName || user?.username || "U").trim().slice(0, 1).toUpperCase()}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium leading-none">Profile photo</p>
              <p className="text-[12px] leading-[16px] text-[var(--cz-text-secondary)] mt-1">Backend Appwrite bucket • PNG/JPG up to 4MB • Secure server-side</p>
              <div className="mt-2 flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()} className="h-[32px] px-3 text-[12px]">
                  <Upload className="h-3.5 w-3.5" /> Upload
                </Button>
                {avatarFile ? <span className="text-[11px] text-[var(--cz-text-secondary)] truncate">{avatarFile.name}</span> : null}
              </div>
            </div>
          </div>

          {/* basic */}
          <div className="space-y-3">
            <h3 className="text-[12px] font-semibold tracking-[0.06em] uppercase text-[var(--cz-text-secondary)]">Basic</h3>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-fullName">
                Full name <span className="text-[var(--cz-error)]">*</span>
              </Label>
              <div className="cz-input flex items-center rounded-[10px] px-3 h-[42px]">
                <input
                  id="edit-fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ayush Sharma"
                  maxLength={50}
                  className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 h-full"
                />
              </div>
              <span className="text-[11px] text-[var(--cz-text-secondary)]/60">{fullName.length}/50</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-bio">Bio</Label>
              <div className="cz-input rounded-[10px] p-3">
                <textarea
                  id="edit-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Full-stack student • Building CampusZen"
                  rows={3}
                  maxLength={160}
                  className="w-full bg-transparent outline-none text-[14px] leading-[20px] placeholder:text-[var(--cz-text-secondary)]/50 resize-none"
                />
              </div>
              <span className="text-[11px] text-[var(--cz-text-secondary)]/60">{bio.length}/160</span>
            </div>
          </div>

          {/* academic */}
          <div className="space-y-3">
            <h3 className="text-[12px] font-semibold tracking-[0.06em] uppercase text-[var(--cz-text-secondary)]">Academic</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-college">College</Label>
                <div className="cz-input flex items-center rounded-[10px] px-3 h-[42px]">
                  <input
                    id="edit-college"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="XYZ College"
                    className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 h-full"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-course">Course / Branch</Label>
                <div className="cz-input flex items-center rounded-[10px] px-3 h-[42px]">
                  <input
                    id="edit-course"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="B.Tech CSE"
                    className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 h-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-year">Academic Year</Label>
              <select
                id="edit-year"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="cz-input h-[42px] rounded-[10px] px-3 text-[14px] bg-transparent outline-none text-[var(--cz-text-primary)]"
              >
                <option value="" className="bg-[var(--cz-surface)]">
                  Select year
                </option>
                <option value="1st Year" className="bg-[var(--cz-surface)]">
                  1st Year
                </option>
                <option value="2nd Year" className="bg-[var(--cz-surface)]">
                  2nd Year
                </option>
                <option value="3rd Year" className="bg-[var(--cz-surface)]">
                  3rd Year
                </option>
                <option value="4th Year" className="bg-[var(--cz-surface)]">
                  4th Year
                </option>
                <option value="5th Year" className="bg-[var(--cz-surface)]">
                  5th Year
                </option>
                <option value="Graduated" className="bg-[var(--cz-surface)]">
                  Graduated
                </option>
              </select>
            </div>
          </div>

          {/* social */}
          <div className="space-y-3">
            <h3 className="text-[12px] font-semibold tracking-[0.06em] uppercase text-[var(--cz-text-secondary)]">Social — username only for GitHub</h3>
            <div className="grid gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-github" className="inline-flex items-center gap-1.5">
                  <Github className="h-3.5 w-3.5 text-[var(--cz-text-primary)]" /> GitHub username
                </Label>
                <div className="cz-input flex items-center gap-2 rounded-[10px] px-3 h-[42px]">
                  <span className="text-[13px] text-[var(--cz-text-secondary)] select-none">github.com/</span>
                  <input
                    id="edit-github"
                    value={github}
                    onChange={(e) => setGithub(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
                    placeholder="user_synax"
                    maxLength={39}
                    className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 h-full"
                  />
                </div>
                <span className="text-[11px] text-[var(--cz-text-secondary)]/60">Used for the GitHub tab contribution graph</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-twitter" className="inline-flex items-center gap-1.5">
                  <Twitter className="h-3.5 w-3.5 text-[var(--cz-text-primary)]" /> X / Twitter
                </Label>
                <div className="cz-input flex items-center gap-2 rounded-[10px] px-3 h-[42px]">
                  <span className="text-[13px] text-[var(--cz-text-secondary)] select-none">@</span>
                  <input
                    id="edit-twitter"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value.replace(/^@/, ""))}
                    placeholder="user_synax"
                    className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 h-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-linkedin" className="inline-flex items-center gap-1.5">
                  <Linkedin className="h-3.5 w-3.5 text-[var(--cz-text-primary)]" /> LinkedIn
                </Label>
                <div className="cz-input flex items-center rounded-[10px] px-3 h-[42px]">
                  <input
                    id="edit-linkedin"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="in/handle or full URL"
                    className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 h-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-instagram" className="inline-flex items-center gap-1.5">
                  <Instagram className="h-3.5 w-3.5 text-[var(--cz-text-primary)]" /> Instagram
                </Label>
                <div className="cz-input flex items-center gap-2 rounded-[10px] px-3 h-[42px]">
                  <span className="text-[13px] text-[var(--cz-text-secondary)] select-none">@</span>
                  <input
                    id="edit-instagram"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
                    placeholder="user_synax"
                    className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 h-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[var(--cz-border)]">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {loading ? "Saving…" : "Save"}
            </Button>
          </div>
          <div className="text-center text-[11px] text-[var(--cz-text-secondary)]/60">Username @{user?.username} cannot be changed here.</div>
        </form>
      </div>
    </div>
  );

  // portal to body for overlay
  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
