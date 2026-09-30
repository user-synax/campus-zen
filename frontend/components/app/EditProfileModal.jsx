"use client";

import {
  Check,
  Github,
  Image as ImageIcon,
  Instagram,
  Linkedin,
  Loader2,
  Twitter,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [instagram, setInstagram] = useState(
    user?.socialLinks?.instagram || "",
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(user?.coverUrl || null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const modalRef = useRef(null);
  const fileRef = useRef(null);
  const coverRef = useRef(null);

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
      setCoverPreview(user.coverUrl || null);
      setCoverFile(null);
      setCoverRemoved(false);
    }
  }, [user]);

  // open/close animation
  useEffect(() => {
    if (open) {
      setShow(true);
      // lock scroll
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => {
        modalRef.current?.classList.add("is-open");
      }, 10);
      return () => clearTimeout(t);
    } else if (show) {
      modalRef.current?.classList.remove("is-open");
      modalRef.current?.classList.add("is-closing");
      const t = setTimeout(() => {
        setShow(false);
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

  const handleCover = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      setError("Cover must be under 4MB");
      return;
    }
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
    setCoverRemoved(false);
    setError("");
  };

  const removeCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setCoverRemoved(true);
    if (coverRef.current) coverRef.current.value = "";
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
            setError(
              `${msg} — add APPWRITE_* env on backend (see backend/.env.example)`,
            );
          } else {
            setError(msg);
          }
          setLoading(false);
          return;
        }
      }

      let coverUrl = user?.coverUrl || null;
      if (coverFile) {
        try {
          const up = await api.uploadCover(coverFile);
          coverUrl = up.data?.user?.coverUrl || coverUrl;
        } catch (e) {
          const msg = e.data?.message || e.message || "Cover upload failed";
          if (e.status === 503) {
            setError(
              `${msg} — add APPWRITE_* env on backend (see backend/.env.example)`,
            );
          } else {
            setError(msg);
          }
          setLoading(false);
          return;
        }
      } else if (coverRemoved) {
        coverUrl = null;
      }

      const payload = {
        fullName: fullName.trim(),
        bio: bio.trim() || null,
        college: college.trim() || null,
        course: course.trim() || null,
        academicYear: academicYear || null,
        // avatarUrl already updated via /me/avatar if file was uploaded; include only if no file or to keep consistent
        ...(avatarFile ? {} : { avatarUrl: avatarUrl || null }),
        ...(coverFile ? {} : { coverUrl: coverUrl || null }),
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
      if (coverFile && coverUrl) finalUser.coverUrl = coverUrl;
      if (coverRemoved && !coverFile) finalUser.coverUrl = null;
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
        className="absolute inset-0 cursor-default border-0 bg-[var(--cz-overlay)] p-0 backdrop-blur-[2px] m-0"
        tabIndex={-1}
      />
      {/* modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        className="t-modal relative flex w-full max-h-[92dvh] flex-col overflow-hidden rounded-t-[16px] border border-[var(--cz-border)] bg-[var(--cz-elevated)] shadow-[var(--shadow-sm)] sm:max-h-[88dvh] sm:max-w-[600px] sm:rounded-[16px]"
      >
        {/* header */}
        <div className="sticky top-0 z-10 flex h-[53px] shrink-0 items-center justify-between border-b border-[var(--cz-border)] bg-[var(--cz-elevated)] px-4">
          <h2 className="text-[20px] leading-6 font-extrabold text-[var(--cz-text-primary)]">
            Edit profile
          </h2>
          <button
            onClick={onClose}
            className="-mr-1 grid h-[34px] w-[34px] place-items-center rounded-full text-[var(--cz-text-secondary)] transition-colors hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]"
            aria-label="Close"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex-1 space-y-7 overflow-y-auto px-4 py-5"
        >
          {error ? (
            <div className="rounded-[4px] bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)] px-3 py-2.5 text-[15px] leading-[20px] text-[var(--cz-error)]">
              {error}
            </div>
          ) : null}

          {/* avatar */}
          <div className="flex items-center gap-4">
            <span className="grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] font-bold text-[20px] text-[var(--cz-text-primary)]">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="avatar preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                (fullName || user?.username || "U")
                  .trim()
                  .slice(0, 1)
                  .toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold leading-[20px]">
                Profile photo
              </p>
              <p className="mt-1 text-[13px] leading-[16px] text-[var(--cz-text-secondary)]">
                PNG/JPG up to 4MB
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" aria-hidden /> Upload
                </Button>
                {avatarFile ? (
                  <span className="truncate text-[13px] text-[var(--cz-text-secondary)]">
                    {avatarFile.name}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* appearance — avatar + cover only. The 5-hue accent picker is
              gone: DESIGN.md allows exactly one chromatic colour. */}
          <div className="space-y-5">
            <h3 className="text-[15px] font-bold text-[var(--cz-text-primary)]">
              Profile
            </h3>

            <div className="flex flex-col gap-1.5">
              <Label>Cover banner</Label>
              <div className="relative h-[100px] overflow-hidden rounded-[4px] bg-[var(--cz-surface-strong)]">
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverPreview}
                    alt="cover preview"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input
                  ref={coverRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCover}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => coverRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4" aria-hidden />
                  {coverPreview ? "Change" : "Upload"}
                </Button>
                {coverPreview ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeCover}
                  >
                    Remove
                  </Button>
                ) : null}
                {coverFile ? (
                  <span className="truncate text-[13px] text-[var(--cz-text-secondary)]">
                    {coverFile.name}
                  </span>
                ) : null}
              </div>
              <span className="text-[13px] text-[var(--cz-text-secondary)]">
                PNG/JPG up to 4MB • wide images look best
              </span>
            </div>
          </div>

          {/* basic */}
          <div className="space-y-4">
            <h3 className="text-[15px] font-bold text-[var(--cz-text-primary)]">
              About you
            </h3>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-fullName">
                Full name <span className="text-[var(--cz-error)]">*</span>
              </Label>
              <div className="cz-input flex h-[44px] items-center rounded-[4px] px-3">
                <input
                  id="edit-fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ayush Sharma"
                  maxLength={50}
                  className="h-full flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
                />
              </div>
              <span className="text-[13px] text-[var(--cz-text-secondary)]">
                {fullName.length}/50
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-bio">Bio</Label>
              <div className="cz-input rounded-[4px] p-3">
                <textarea
                  id="edit-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Full-stack student • Building CampusZen"
                  rows={3}
                  maxLength={160}
                  className="w-full resize-none bg-transparent text-[15px] leading-[20px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
                />
              </div>
              <span className="text-[13px] text-[var(--cz-text-secondary)]">
                {bio.length}/160
              </span>
            </div>
          </div>

          {/* academic */}
          <div className="space-y-4">
            <h3 className="text-[15px] font-bold text-[var(--cz-text-primary)]">
              College
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-college">College</Label>
                <div className="cz-input flex h-[44px] items-center rounded-[4px] px-3">
                  <input
                    id="edit-college"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="XYZ College"
                    className="h-full flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-course">Course / Branch</Label>
                <div className="cz-input flex h-[44px] items-center rounded-[4px] px-3">
                  <input
                    id="edit-course"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="B.Tech CSE"
                    className="h-full flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-year">Academic year</Label>
              <select
                id="edit-year"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="cz-input h-[44px] rounded-[4px] bg-transparent px-3 text-[15px] text-[var(--cz-text-primary)] outline-none"
              >
                {[
                  "",
                  "1st Year",
                  "2nd Year",
                  "3rd Year",
                  "4th Year",
                  "5th Year",
                  "Graduated",
                ].map((y) => (
                  <option key={y} value={y}>
                    {y || "Select year"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* social */}
          <div className="space-y-4">
            <h3 className="text-[15px] font-bold text-[var(--cz-text-primary)]">
              Links
            </h3>
            <div className="grid gap-4">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="edit-github"
                  className="inline-flex items-center gap-1.5"
                >
                  <Github className="h-4 w-4" aria-hidden /> GitHub username
                </Label>
                <div className="cz-input flex h-[44px] items-center gap-2 rounded-[4px] px-3">
                  <span className="select-none text-[15px] text-[var(--cz-text-secondary)]">
                    github.com/
                  </span>
                  <input
                    id="edit-github"
                    value={github}
                    onChange={(e) =>
                      setGithub(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))
                    }
                    placeholder="user_synax"
                    maxLength={39}
                    className="h-full flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
                  />
                </div>
                <span className="text-[13px] text-[var(--cz-text-secondary)]">
                  Used for the GitHub contribution graph
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="edit-twitter"
                  className="inline-flex items-center gap-1.5"
                >
                  <Twitter className="h-4 w-4" aria-hidden /> X / Twitter
                </Label>
                <div className="cz-input flex h-[44px] items-center gap-2 rounded-[4px] px-3">
                  <span className="select-none text-[15px] text-[var(--cz-text-secondary)]">
                    @
                  </span>
                  <input
                    id="edit-twitter"
                    value={twitter}
                    onChange={(e) =>
                      setTwitter(e.target.value.replace(/^@/, ""))
                    }
                    placeholder="user_synax"
                    className="h-full flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="edit-linkedin"
                  className="inline-flex items-center gap-1.5"
                >
                  <Linkedin className="h-4 w-4" aria-hidden /> LinkedIn
                </Label>
                <div className="cz-input flex h-[44px] items-center rounded-[4px] px-3">
                  <input
                    id="edit-linkedin"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="in/handle or full URL"
                    className="h-full flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="edit-instagram"
                  className="inline-flex items-center gap-1.5"
                >
                  <Instagram className="h-4 w-4" aria-hidden /> Instagram
                </Label>
                <div className="cz-input flex h-[44px] items-center gap-2 rounded-[4px] px-3">
                  <span className="select-none text-[15px] text-[var(--cz-text-secondary)]">
                    @
                  </span>
                  <input
                    id="edit-instagram"
                    value={instagram}
                    onChange={(e) =>
                      setInstagram(e.target.value.replace(/^@/, ""))
                    }
                    placeholder="user_synax"
                    className="h-full flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-[var(--cz-border)] pt-5">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" aria-hidden />
              )}
              {loading ? "Saving…" : "Save"}
            </Button>
          </div>
          <p className="text-center text-[13px] text-[var(--cz-text-secondary)]">
            @{user?.username} cannot be changed.
          </p>
        </form>
      </div>
    </div>
  );

  // portal to body for overlay
  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
