import React, { useState, useEffect } from "react";
import "../../utilities.css";
import "./Settings.css";

import {
  Layout,
  Button,
  InputNumber,
  Form,
  Select,
  Switch,
  message,
  Typography,
  Modal,
  Spin,
} from "antd";
import { get, post } from "../../utilities";
import { navigate } from "@reach/router";
const { Content } = Layout;
const { Paragraph, Title } = Typography;

const HELP_URL = "https://github.com/cory2067/osumod/blob/master/README.md";
const DISCORD_URL = "https://disc" + "ord.gg/J49Hgm8yct";

function Settings({ user, updateUser }) {
  const [settings, setSettings] = useState();
  const [loading, setLoading] = useState();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    document.title = `Queue Settings`;
  }, []);

  useEffect(() => {
    (async () => {
      if (!user._id) return;
      try {
        const res = await get("/api/settings", { owner: user.userid });
        setSettings(res.queue);
      } catch (e) {
        navigate("/404");
      }
    })();
  }, [user]);

  const onFinish = async (form) => {
    setLoading("save-settings");
    try {
      await post("/api/settings", { settings: form });
      message.success("Updated settings");
    } catch (e) {
      console.log(e);
      message.error("Failed to update settings");
    }
    setLoading("");
  };

  const onDelete = async () => {
    await post("/api/archive-queue");
    navigate("/");
  };

  const onArchive = async ({ status, age }) => {
    setLoading("archive");
    const res = await post("/api/archive-batch", { status, age });
    setLoading("");
    if (res.modified === 0) {
      message.info("No requests to archive");
    } else {
      message.success(`Archived ${res.modified} requests`);
    }
  };

  const onUsernameUpdate = async () => {
    setLoading("update-username");
    try {
      const user = await post("/api/update-username");
      message.success("Updated username");
    } catch (e) {
      message.error("Something went wrong");
    }
    updateUser(user);
    setLoading("");
  };

  const reqLink = `${window.location.protocol}//${window.location.host}/${user.username}/request`;

  return (
    <Content className="content">
      {settings && user._id ? (
        <div className="Settings-wrapper">
          <Paragraph>
            <a href={HELP_URL} target="_blank">
              Click here
            </a>{" "}
            for instructions on how to use your queue. For feature requests and to be notified about
            website updates, join the osumod Discord server{" "}
            <a href={DISCORD_URL} target="_blank">
              here
            </a>
            .
          </Paragraph>
          <Paragraph>
            Mappers can request you at: <a href={reqLink}>{reqLink}</a>
          </Paragraph>
          <hr />
          <Title level={4}>Queue settings</Title>
          <Form initialValues={settings} onFinish={onFinish}>
            <Form.Item label="Open" name="open" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="Accept M4M requests" name="m4m" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="Max pending requests before auto-close" name="maxPending">
              <InputNumber />
            </Form.Item>
            <Form.Item label="Cooldown between requests (days)" name="cooldown">
              <InputNumber />
            </Form.Item>
            <Form.Item label="Modder Type" name="modderType">
              <Select>
                <Select.Option value="full">Full BN</Select.Option>
                <Select.Option value="probation">Probationary BN</Select.Option>
                <Select.Option value="modder">Regular Modder</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="Gamemodes" name="modes">
              <Select mode="multiple">
                <Select.Option value="Standard">Standard</Select.Option>
                <Select.Option value="Taiko">Taiko</Select.Option>
                <Select.Option value="Catch the Beat">Catch</Select.Option>
                <Select.Option value="Mania">Mania</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item className="Settings-button-container">
              <Button type="primary" htmlType="submit" loading={loading === "save-settings"}>
                Save Settings
              </Button>
              <Button type="secondary" onClick={() => setShowDeleteModal(true)}>
                Delete Queue
              </Button>
            </Form.Item>
          </Form>
          <hr />
          <Title level={4}>Archive requests in bulk</Title>
          <Form initialValues={{ status: "any", age: 30 }} onFinish={onArchive}>
            <Form.Item label="Archive request with this status:" name="status">
              <Select>
                <Select.Option value="any">Any</Select.Option>
                <Select.Option value="Pending">Pending</Select.Option>
                <Select.Option value="Rejected">Rejected</Select.Option>
                <Select.Option value="Accepted">Accepted</Select.Option>
                {settings.modderType === "probation" || settings.modderType === "full" ? (
                  <>
                    <Select.Option value="Modded">Modded</Select.Option>
                    <Select.Option value="Nominated">Nominated</Select.Option>
                    <Select.Option value="Ranked">Ranked</Select.Option>
                  </>
                ) : (
                  <Select.Option value="Finished">Finished</Select.Option>
                )}
              </Select>
            </Form.Item>
            <Form.Item label="And are at least this many days old:" name="age">
              <InputNumber />
            </Form.Item>
            <Form.Item className="Settings-button-container">
              <Button type="primary" htmlType="submit" loading={loading === "archive"}>
                Archive
              </Button>
            </Form.Item>
          </Form>
          <hr />
          <Title level={4}>Update Username</Title>
          <Paragraph>
            This will get your latest username from osu! and rename your queue accordingly. Note
            that this will change your queue's URL.
          </Paragraph>
          <Button
            type="primary"
            onClick={() => onUsernameUpdate()}
            loading={loading === "update-username"}
          >
            Update
          </Button>
        </div>
      ) : (
        <div className="Settings-loading">
          <Spin size="large" />
        </div>
      )}

      <Modal
        title="Delete Queue"
        visible={showDeleteModal}
        onOk={onDelete}
        onCancel={() => setShowDeleteModal(false)}
        okText="Delete"
      >
        <p>Are you sure you want to delete this queue?</p>
        <p>
          If you change your mind, you can click "Create a Queue" on the home page and your settings
          and past requests will be recovered.
        </p>
      </Modal>
    </Content>
  );
}

export default Settings;
