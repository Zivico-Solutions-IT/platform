import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { BonusPost } from "../../types";
import { api } from "../../services/api";

export const BonusPostsTab: React.FC = () => {
  const { currentCompany, addToast } = usePortal();
  const [posts, setPosts] = useState<BonusPost[]>([]);
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await api.getBonusPosts(currentCompany));
    } catch (error: any) {
      addToast("error", "Bonus Posts Unavailable", error?.message || "Could not load bonus posts.");
    } finally {
      setLoading(false);
    }
  }, [currentCompany, addToast]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const selectImage = (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      addToast("error", "Unsupported Image", "Upload a PNG, JPG, or WEBP image.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      addToast("error", "Image Too Large", "Please use an image smaller than 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const publish = async () => {
    if (!title.trim() || !image) {
      addToast("error", "Post Incomplete", "Enter an offer title and choose an image.");
      return;
    }
    if (posts.length >= 2) {
      addToast("error", "Limit Reached", "Only two bonus posts can be active. Remove one first.");
      return;
    }
    setSaving(true);
    try {
      const post = await api.createBonusPost(currentCompany, { title: title.trim(), image });
      setPosts((previous) => [post, ...previous]);
      setTitle("");
      setImage("");
      if (inputRef.current) inputRef.current.value = "";
      addToast("success", "Bonus Post Published", "Clients can now see this offer.");
    } catch (error: any) {
      addToast("error", "Publish Failed", error?.message || "Could not publish the bonus post.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (post: BonusPost) => {
    try {
      await api.deleteBonusPost(currentCompany, post.id);
      setPosts((previous) => previous.filter((item) => item.id !== post.id));
      addToast("success", "Bonus Post Removed", "The offer is no longer active.");
    } catch (error: any) {
      addToast("error", "Remove Failed", error?.message || "Could not remove the bonus post.");
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-sm font-black tracking-wider text-slate-900">BONUS POSTS</h2>
          <p className="mt-1 text-xs text-slate-500">Publish up to two image offers for clients to view in their portal.</p>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-mono text-xs font-bold text-amber-700">{posts.length}/2 active</span>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-bold text-slate-800">Create bonus post</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Offer title</span><input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="Example: 20% first deposit bonus" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500" /></label>
          <div className="flex items-end gap-2"><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => selectImage(event.target.files?.[0])} /><button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-[42px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-100"><ImagePlus className="h-4 w-4" /> Choose image</button><button type="button" disabled={saving || posts.length >= 2} onClick={publish} className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-amber-600 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{saving ? "Publishing" : "Publish post"}</button></div>
        </div>
        {image && <div className="mt-3 flex items-center gap-3"><img src={image} alt="Offer preview" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" /><span className="text-xs text-emerald-700">Image ready to publish</span></div>}
      </div>

      <div className="mt-5">
        {loading ? <div className="flex justify-center py-10"><LoaderCircle className="h-5 w-5 animate-spin text-slate-400" /></div> : posts.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No bonus posts published yet.</p> : <div className="grid gap-4 md:grid-cols-2">{posts.map((post) => <article key={post.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white"><img src={post.image} alt={post.title} className="h-44 w-full object-cover" /><div className="flex items-center justify-between gap-3 p-3"><h3 className="truncate text-sm font-bold text-slate-800">{post.title}</h3><button type="button" onClick={() => remove(post)} className="rounded border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50" title="Remove post"><Trash2 className="h-4 w-4" /></button></div></article>)}</div>}
      </div>
    </section>
  );
};
