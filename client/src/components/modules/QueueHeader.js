import React, { Component } from "react";
import "../../utilities.css";
import "./QueueHeader.css";
import OsuLogoOutline from "../../public/osu-logo-outline.svg";
import Icon from "@ant-design/icons";
import { getProfile, isBN } from "../../utilities";
import { CheckCircleFilled, StopFilled } from "@ant-design/icons";
import { Switch } from "antd";

function getTitleText(owner, modderType) {
  const name = owner.username;
  if (isBN(modderType)) {
    return `${name}'s Nomination Queue`;
  }
  return `${name}'s Modding Queue`;
}

export function QueueHeader({ user, owner, open, modderType, customTitle, toggleOpen }) {
  if (!owner) {
    return <></>;
  }

  const isOwner = user && owner._id === user._id;
  const openText = open ? "Open" : "Closed";
  return (
    <>
      <h1 className="QueueHeader-main">
        <a className="QueueHeader-icon-outer" href={getProfile(owner)} target="_blank">
          {<Icon component={OsuLogoOutline} className="QueueHeader-icon" />}
        </a>
        <span>{customTitle || getTitleText(owner, modderType)}</span>
      </h1>
      <h2 className="QueueHeader-subheader">
        {open ? (
          <CheckCircleFilled style={{ color: "#22A522" }} />
        ) : (
          <StopFilled style={{ color: "#EE2629" }} />
        )}
        {isOwner ? (
          <Switch
            checked={open}
            onClick={toggleOpen}
            checkedChildren="Open"
            unCheckedChildren="Closed"
          />
        ) : (
          openText
        )}
      </h2>
    </>
  );
}
