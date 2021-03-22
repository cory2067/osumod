import React, { useState, useEffect } from "react";
import { Layout, Button, List } from "antd";
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
            title={<a href={`/${item.owner}`}>{item.owner} </a>}
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
