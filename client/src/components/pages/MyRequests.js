import React, { useState, useEffect } from "react";
import "../../utilities.css";
import "./MyRequests.css";
import { delet, get, post } from "../../utilities";

import { Layout, Spin, Switch } from "antd";
const { Content } = Layout;
import RequestList from "../modules/RequestList";
import Loading from "../modules/Loading";

function MyRequests({ user }) {
  const [requests, setRequests] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [tableMode, setTableMode] = useState(false);
  const [hideRejected, setHideRejected] = useState(false);

  const fetchRequests = () => {
    get("/api/my-requests", {
      cursor: requests.length ? requests[requests.length - 1].requestDate : "",
    }).then((newReqs) => {
      setInitialLoad(false);
      setRequests([...requests, ...newReqs]);
    });
  };

  useEffect(() => {
    document.title = "My Requests";
  }, []);

  useEffect(() => {
    if (!user._id) return;
    fetchRequests();
  }, [user]);

  if (user.loggedOut) {
    return (
      <Content className="u-flex-justifyCenter">
        <h2 className="MyRequests-login">Log in to view your requests</h2>
      </Content>
    );
  }

  return (
    <Content className="content">
      <div className="MyRequests-hide-toggle">
        <span className="MyRequests-toggle-label">Hide Rejected:</span>
        <Switch checked={hideRejected} onClick={() => setHideRejected(!hideRejected)} />
      </div>
      <div className="MyRequests-compact-toggle">
        <span className="MyRequests-toggle-label">Table Mode:</span>
        <Switch checked={tableMode} onClick={() => setTableMode(!tableMode)} />
      </div>
      <h1 className="MyRequests-header">Requests to Modders</h1>
      {!user._id || initialLoad ? (
        <Loading />
      ) : (
        <RequestList
          requests={hideRejected ? requests.filter((r) => r.status !== "Rejected") : requests}
          requesterMode={true}
          tableMode={tableMode}
          onShowMore={fetchRequests}
        />
      )}
    </Content>
  );
}

export default MyRequests;
