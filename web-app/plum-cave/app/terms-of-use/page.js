// app/terms-of-use/page.js
"use client";
import React, { useState } from "react";
import { AiOutlineHome } from "react-icons/ai";
import { useRouter } from "next/navigation";

export default function TermsOfUsePage() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <main
      style={{
        background: "var(--background)",
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "32px 0 0 0",
        }}
      >
        {/* Home icon + text */}
        <a
          href="/"
          style={{
              display: "flex",
              alignItems: "center",
              background: "none",
              border: "none",
              color: isHovered ? "var(--foreground)" : "var(--second-theme-color)",
              fontSize: "1.3rem",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: "36px",
              gap: "10px",
              padding: 0,
              transition: "color 0.3s",
              textDecoration: "none",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label="Go to Home"
          >
          <AiOutlineHome size={28} />
          <span>Home</span>
        </a>

        {/* Title */}
        <h1
          style={{
            textAlign: "center",
            fontSize: "3rem",
            fontWeight: 700,
            marginBottom: "40px",
            color: "var(--foreground)",
            letterSpacing: "-1px",
          }}
        >
          Terms of Use
        </h1>

        <div style={{ color: "var(--foreground)", fontSize: "1.15rem" }}>
          {/* 1. Agreement to Terms */}
          <section style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>
              1. Agreement to Terms
            </h2>
            <p>
              By accessing or using Plum Cave in any form, you, as an end user, agree to these Terms of Use. If you do not accept these terms, you are not authorized to access or use this application.
            </p>
          </section>

          {/* 2. User Conduct */}
          <section style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>
              2. User Conduct
            </h2>
            <p>
            Users must not post, upload, share, or distribute any content for which they do not have the appropriate rights or permissions, including, but not limited to, material that is unlicensed, pirated, illegal, or infringes upon the intellectual property or other rights of others. Users are solely responsible for their actions and content within the application.
            </p>
          </section>

          {/* 3. Third-Party Services */}
          <section style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>
              3. Third-Party Services
            </h2>
            <p>
              The application uses Google services for authentication and data storage. User data is stored on Google servers located in the United States, the storage location is us-south1 (Dallas).
            </p>
          </section>

          {/* 4. Data Usage */}
          <section style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>
              4. Data Usage
            </h2>
            <p>
              User email addresses and other information present in the application may be used for promotional and advertisement purposes, whether related or unrelated to the application. User data may also be used for compiling and publishing anonymized statistics regarding application usage.
            </p>
          </section>

          {/* 5. Service Availability and Modifications */}
          <section style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>
              5. Service Availability and Modifications
            </h2>
            <p>
              Availability of the application and its features is not guaranteed. The application may be updated, modified, suspended, or discontinued at any time without prior notice.
            </p>
          </section>

          {/* 6. Limitation of Liability */}
          <section style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>
              6. Limitation of Liability
            </h2>
            <p>
              The application is provided under the MIT License and is offered “as is” and “as available,” without any warranties or guarantees, express or implied. To the fullest extent permitted by law, the author shall not be liable for any direct, indirect, incidental, special, consequential, punitive, exemplary, or other damages—including, but not limited to, loss of profits, revenue, data, use, goodwill, business interruption, or other intangible losses—arising from or related to the use, misuse, inability to use, or reliance on the application, regardless of the legal theory and even if the author has been advised of the possibility of such damages. The author reserves the right to terminate user accounts or delete user data at any time, with or without notice or explanation. Users assume all risks and responsibilities for their actions and any consequences resulting from use of the application.
            </p>
          </section>

          {/* 7. Changes to Terms */}
          <section style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>
              7. Changes to Terms
            </h2>
            <p>
              These Terms of Use may be changed at any time, with or without notice. It is the user's responsibility to review the current version of the Terms of Use. Continued use of the application following any changes constitutes acceptance of the updated terms.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
