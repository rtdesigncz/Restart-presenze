// ... (resto del file invariato)

  const createInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.push("Compila nome, email e password.", "info");
      return;
    }

    // PRENDE IL TOKEN
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) {
      toast.push("Sessione scaduta: rientra e riprova.", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/create-instructor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // <-- QUI IL TOKEN
        },
        body: JSON.stringify({
          p_full_name: form.name.trim(),
          p_email: form.email.trim(),
          p_password: form.password,
          p_pin: form.pin.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.push(json?.error || "Errore nella creazione.", "error");
      } else if (json?.warning) {
        toast.push(json.warning, "info");
        setForm({ name: "", email: "", password: "", pin: "" });
        load();
      } else {
        toast.push("Istruttore creato.", "success");
        setForm({ name: "", email: "", password: "", pin: "" });
        load();
      }
    } catch (err: any) {
      toast.push(err?.message || "Errore di rete.", "error");
    }
  };

// ... (resto del file invariato)