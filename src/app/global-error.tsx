"use client";

import Error from "next/error";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* Your Error component here... */}
      </body>
    </html>
  );
}
