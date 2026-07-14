"use client";

import React from "react";
import Navbar from "../components/Navbar";
import DashboardStats from "../components/DashboardStats";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "32px 24px" }}>
        <DashboardStats />
      </main>
    </div>
  );
}


