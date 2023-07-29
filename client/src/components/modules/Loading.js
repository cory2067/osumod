import React from "react";
import { Spin } from "antd";
import "./Loading.css";

export default function Loading() {
  return (
    <div className="u-flex-justifyCenter">
      <div className="Loading-spinner">
        <Spin size="large" />
      </div>
    </div>
  );
}
