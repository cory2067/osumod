import React, { Component } from "react";
import "../../utilities.css";
import "./Queue.css";

import {
  Layout,
  Button,
  Modal,
  Input,
  Form,
  Select,
  Switch,
  Table,
  Alert,
  message,
  Tooltip,
  Popconfirm,
} from "antd";
const { TextArea } = Input;
import { navigate } from "@reach/router";
import { delet, get, post } from "../../utilities";
import MapCard, { DiffList, StatusLabel } from "../modules/MapCard";
import RequestList from "../modules/RequestList";
import Icon, { MessageOutlined } from "@ant-design/icons";
const { Content } = Layout;

const DISCORD_URL = "https://disc" + "ord.gg/J49Hgm8yct";

const BANNER_KEY = "closedBanner";
const BANNER_ENABLED = false;
const BANNER_VERSION = "1";

const COMPACT_KEY = "compactMode";
const PAGE_SIZE = 50;

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

class Queue extends Component {
  constructor(props) {
    super(props);
    this.form = React.createRef();
    this.state = {
      reqs: [],
      editing: null,
      showDiscordInvite: localStorage.getItem(BANNER_KEY) !== BANNER_VERSION,
      loading: false,
      compact: localStorage.getItem(COMPACT_KEY) === "true",
      numToShow: 50,
    };
  }

  async componentDidMount() {
    this.fetchRequests(this.state.numToShow);

    get("/api/settings", { owner: this.props.owner })
      .then((settings) => {
        this.setState({
          m4m: settings.queue.m4m,
          modderType: settings.queue.modderType,
          owner: settings.owner,
        });
        document.title = `${settings.owner.username}'s queue`;
      })
      .catch((e) => {
        navigate("/404");
      });
  }

  fetchRequests = () => {
    const reqs = this.state.reqs;
    get("/api/requests", {
      archived: this.props.archived,
      target: this.props.owner,
      cursor: reqs.length ? reqs[reqs.length - 1].requestDate : "",
    }).then((newReqs) => this.setState({ reqs: [...reqs, ...newReqs] }));
  };

  onShowMore = () => {
    const numToShow = this.state.numToShow + 50;
    this.fetchRequests(numToShow);
  };

  isOwner = () => this.state.owner && this.props.user._id === this.state.owner._id;

  loadingWrapper =
    (fn) =>
    async (...args) => {
      this.setState({ loading: true });
      try {
        await fn(...args);
      } finally {
        this.setState({ loading: false });
      }
    };

  edit = (req) => {
    if (!this.isOwner()) return;
    this.setState({ editing: req._id });
    // this is jank, todo fix this
    setTimeout(() => this.form.current.setFieldsValue({ feedback: "", ...req }));
  };

  onFinish = this.loadingWrapper(async (form) => {
    const updated = await post("/api/request-edit", { ...form, id: this.state.editing });
    this.setState({
      editing: null,
      reqs: this.state.reqs
        .map((req) => (req._id === this.state.editing ? updated : req))
        .filter((req) => req.archived === this.props.archived),
    });
  });

  onRefresh = this.loadingWrapper(async () => {
    try {
      const updated = await post("/api/request-refresh", { id: this.state.editing });
      this.setState({
        editing: null,
        reqs: this.state.reqs.map((req) => (req._id === this.state.editing ? updated : req)),
      });
    } catch (e) {
      message.error("Couldn't refresh; this map might have been deleted");
    }
  });

  onDelete = this.loadingWrapper(async () => {
    await delet("/api/request", { id: this.state.editing });
    this.setState({
      editing: null,
      reqs: this.state.reqs.filter((req) => req._id !== this.state.editing),
    });
  });

  isBN = () => this.state.modderType === "probation" || this.state.modderType === "full";

  titleText = () => {
    if (this.state.archived) {
      return "Archives";
    }
    if (this.isBN()) {
      return "Nomination Queue";
    }
    return "Modding Queue";
  };

  toggleCompact = () =>
    this.setState((state) => {
      localStorage.setItem(COMPACT_KEY, !state.compact);
      return {
        compact: !state.compact,
      };
    });

  render() {
    return (
      <Content className="content">
        {BANNER_ENABLED && this.isOwner() && this.state.showDiscordInvite && (
          <Alert
            message={
              <>
                <div>
                  Thanks for using osumod!{" "}
                  <a href={DISCORD_URL} target="_blank">
                    Click here
                  </a>{" "}
                  to join the osumod discord (invite link fixed now!)
                </div>
              </>
            }
            type="info"
            closable
            onClose={() => {
              this.setState({ showDiscordInvite: false });
              localStorage.setItem(BANNER_KEY, BANNER_VERSION);
            }}
          />
        )}
        <div className="Queue-compact-toggle">
          <span className="Queue-compact-toggle-label">Table Mode:</span>
          <Switch checked={this.state.compact} onClick={this.toggleCompact} />
        </div>

        {this.state.modderType && (
          <h1 className="Queue-header">
            {this.state.owner.username}'s {this.titleText()}
          </h1>
        )}
        <RequestList
          requests={this.state.reqs}
          tableMode={this.state.compact}
          archiveMode={this.props.archived}
          showModType={this.state.m4m && !this.props.archived}
          onEdit={this.edit}
          hasMore={this.state.reqs.length && this.state.reqs.length % PAGE_SIZE == 0}
          onShowMore={this.onShowMore}
        />
        <Modal
          title="Manage Request"
          visible={this.state.editing}
          footer={false}
          onCancel={() => this.setState({ editing: null })}
        >
          <Form
            ref={this.form}
            onFinish={this.onFinish}
            name="edit"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Form.Item label="Status" name="status">
              <Select>
                <Select.Option value="Pending">Pending</Select.Option>
                <Select.Option value="Rejected">Rejected</Select.Option>
                <Select.Option value="Accepted">Accepted</Select.Option>
                {this.isBN() ? (
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
            <Form.Item label="Feedback" name="feedback">
              <TextArea rows={3} />
            </Form.Item>
            <Form.Item label="Archived" name="archived" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item className="Queue-buttoncontainer">
              <Button type="primary" htmlType="submit" disabled={this.state.loading}>
                Submit
              </Button>
              <Button onClick={this.onRefresh} disabled={this.state.loading}>
                Refresh
              </Button>
              <Popconfirm title="Permanently delete this request?" onConfirm={this.onDelete}>
                <Button disabled={this.state.loading}>Delete</Button>
              </Popconfirm>
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    );
  }
}

export default Queue;
