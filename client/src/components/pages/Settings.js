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
} from "antd";
import { get, post } from "../../utilities";
import { navigate } from "@reach/router";
const { Content } = Layout;
const { Paragraph } = Typography;

const HELP_URL = "https://github.com/cory2067/osumod/blob/master/README.md";

function Settings({ owner }) {
  const form = React.createRef();
  const [settings, setSettings] = useState();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await get("/api/settings", { owner });
      if (!res) navigate("/404");
      setSettings(res);
    })();
  }, [owner]);

  const onFinish = async (form) => {
    try {
      await post("/api/settings", { settings: form });
      message.success("Updated settings");
    } catch (e) {
      console.log(e);
      message.success("Failed to update settings");
    }
  };

  const onDelete = async () => {
    await post("/api/archive-queue");
    navigate("/");
  };

  const reqLink = `${window.location.protocol}//${window.location.host}/${
    window.location.pathname.split("/")[1]
  }/request`;

  return (
    <Content className="content">
      {settings && (
        <div style={{ maxWidth: 500 }}>
          <Paragraph>
            <a href={HELP_URL} target="_blank">
              Click here
            </a>{" "}
            for instructions on how to use your queue.
          </Paragraph>
          <Paragraph>
            Mappers can request you at: <a href={reqLink}>{reqLink}</a>
          </Paragraph>
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
              <Button type="primary" htmlType="submit">
                Save Settings
              </Button>
              <Button type="secondary" onClick={() => setShowDeleteModal(true)}>
                Delete Queue
              </Button>
            </Form.Item>
          </Form>
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
