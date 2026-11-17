import { useState } from "react";
import { useLocation } from "react-router";
import { Button, Input } from "../../ui";

function PublicShareButton() {
  const location = useLocation();
  const [feedback, setFeedback] = useState<{ path: string; message: string; manual?: boolean } | null>(null);
  const path = `${location.pathname}${location.search}`;
  const sharedUrl = new URL(path, window.location.origin);
  sharedUrl.searchParams.delete("returnTo");
  sharedUrl.searchParams.delete("searchReturnTo");
  const url = sharedUrl.href;
  const current = feedback?.path === path ? feedback : null;

  const share = async () => {
    setFeedback(null);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: document.title, url });
        setFeedback({ path, message: "Le lien a été partagé." });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setFeedback({ path, message: "Le lien a été copié." });
      } else {
        setFeedback({ path, message: "Sélectionnez et copiez cette adresse.", manual: true });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback({ path, message: "Le partage a échoué. Vous pouvez copier cette adresse.", manual: true });
    }
  };

  return <div className="public-share">
    <Button onClick={() => void share()} variant="outline">Partager cette page</Button>
    <p aria-live="polite" role="status">{current?.message}</p>
    {current?.manual ? <label>Lien de la page
      <Input onFocus={(event) => event.currentTarget.select()} readOnly value={url} />
    </label> : null}
  </div>;
}

export default PublicShareButton;
