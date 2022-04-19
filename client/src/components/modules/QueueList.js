import React, { useState, useEffect } from "react";
import { Layout, Tooltip, List } from "antd";
import ModeIcon from "./ModeIcon";

function QueueList({ title, queues, loading }) {
  return (
    <List
      className="Home-list"
      header={<div>{title}</div>}
      size="large"
      bordered
      loading={loading}
      dataSource={queues}
      renderItem={(item) => (
        <List.Item key={item._id}>
          <List.Item.Meta
            title={
              <Tooltip
                title={
                  item.lastActionedDate
                    ? `Last active ${new Date(item.lastActionedDate).toLocaleString()}`
                    : ""
                }
              >
                <a href={`/${item.owner.username}`}>{item.owner.username} </a>
              </Tooltip>
            }
            description={
              <span>
                {item.modderType === "modder" ? "Modder " : "Beatmap Nominator "}
                {item.modes.map((m) => (
                  <ModeIcon key={m} mode={m} size={14} padding={2} />
                ))}
              </span>
            }
          />

          <div>{item.open ? "Open" : "Closed"}</div>
        </List.Item>
      )}
    />
  );
}

export default QueueList;
