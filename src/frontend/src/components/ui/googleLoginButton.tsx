import { useEffect } from "react"

declare global {
  interface Window {
    google: any
  }
}

interface GoogleLoginButtonProps {
  onSuccess: (user: any) => void;
}

export default function GoogleLogin({ onSuccess }: GoogleLoginButtonProps) {

  useEffect(() => {
    window.google.accounts.id.initialize({
      client_id: "674845336080-t9f78d4paf1nrjlone2f8n4oijs86shr.apps.googleusercontent.com",
      callback: handleCredentialResponse,
    })

    window.google.accounts.id.renderButton(
      document.getElementById("googleButton"),
      {
        theme: "outline",
        size: "large",
      }
    )
  }, [])

  async function handleCredentialResponse(response: any) {

    const res = await fetch("http://localhost:5000/auth/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: response.credential
      }),
    })

    const data = await res.json()

    localStorage.setItem("token", data.token)

    // notify parent (SignInPage → App.tsx)
    onSuccess(data)
  }

  return <div id="googleButton"></div>
}