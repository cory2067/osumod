import React, { useState, useEffect } from "react";
import { Layout, Input, Table, Tooltip } from "antd";
import MapCard, { DiffList, StatusLabel } from "../modules/MapCard";
import Icon, { MessageOutlined } from "@ant-design/icons";

import "./RequestList.css";

const STATUS_TO_ORDER = {
  Accepted: 0,
  Pending: 1,
  Modded: 2,
  Finished: 3,
  Nominated: 4,
  Qualified: 5,
  Ranked: 6,
  Rejected: 7,
};

function RequestList({ requests, tableMode, archiveMode, requesterMode, showModType, onEdit }) {
  const columns = [
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (status, map) => (
        <span className="RequestList-compact-status">
          <StatusLabel {...map} edit={onEdit} />
        </span>
      ),
      sorter: (a, b) => STATUS_TO_ORDER[a.status] - STATUS_TO_ORDER[b.status],
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (title, map) => (
        <a
          target="_blank"
          href={
            map.mapsetId
              ? `https://osu.ppy.sh/s/${map.mapsetId}`
              : `https://osu.ppy.sh/b/${map.mapId}`
          }
        >
          {title}
        </a>
      ),
    },
    { title: "Artist", dataIndex: "artist", key: "artist" },
    requesterMode
      ? { title: "Modder", dataIndex: "target", key: "target", render: (t) => t.username }
      : { title: "Mapper", dataIndex: "creator", key: "creator" },
    { title: "Length", dataIndex: "length", key: "length" },
    { title: "BPM", dataIndex: "bpm", key: "bpm" },
    {
      title: "Difficulties",
      dataIndex: "diffs",
      key: "diffs",
      render: (diffs) => <DiffList diffs={diffs} />,
    },
    {
      title: "Mapper's Comment",
      dataIndex: "comment",
      key: "comment",
      width: 50,
      render: (c) =>
        c && (
          <div className="RequestList-compact-comment">
            <Tooltip title={c}>
              <MessageOutlined />
            </Tooltip>
          </div>
        ),
    },
    {
      title: "Feedback",
      dataIndex: "feedback",
      key: "feedback",
      width: 50,
      render: (c) =>
        c && (
          <div className="RequestList-compact-comment">
            <Tooltip title={c}>
              <MessageOutlined />
            </Tooltip>
          </div>
        ),
    },
  ];
  return (
    <div className="RequestList-container">
      {tableMode ? (
        <Table
          className="RequestList-table"
          columns={columns}
          dataSource={requests}
          pagination={{ pageSize: 50 }}
        />
      ) : (
        requests.map((req) => (
          <MapCard
            {...req}
            edit={onEdit}
            key={req._id}
            compact={archiveMode}
            requester={requesterMode}
            showModType={showModType}
          />
        ))
      )}
    </div>
  );
}

export default RequestList;
