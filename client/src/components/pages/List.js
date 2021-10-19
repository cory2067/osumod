import React, { Component } from "react";
import "../../utilities.css";
import "./List.css";

// data from "../../content/home-en";
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
} from "antd";
const { TextArea } = Input;
import { navigate } from "@reach/router";
import { delet, get, post } from "../../utilities";
import MapCard, { DiffList, StatusLabel } from "../modules/MapCard";
import Icon, { MessageOutlined } from "@ant-design/icons";
const { Content } = Layout;

const DISCORD_URL = "https://disc" + "ord.gg/J49Hgm8yct";

const BANNER_KEY = "closedBanner";
const BANNER_ENABLED = false;
const BANNER_VERSION = "1";

const COMPACT_KEY = "compactMode";

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

class List extends Component {
  constructor(props) {
    super(props);
    this.form = React.createRef();
    this.state = {
      reqs: [],
      editing: null,
      showDiscordInvite: localStorage.getItem(BANNER_KEY) !== BANNER_VERSION,
      loading: false,
      compact: localStorage.getItem(COMPACT_KEY) === "true",
    };
  }

  componentDidMount() {
    document.title = `${this.props.owner}'s queue`;

    get("/api/requests", {
      archived: this.props.archived,
      target: this.props.owner,
    }).then((reqs) => this.setState({ reqs }));

    get("/api/settings", { owner: this.props.owner }).then((settings) => {
      if (!settings) navigate("/404");
      this.setState({ m4m: settings.m4m, modderType: settings.modderType });
    });
  }

  isOwner = () => this.props.user && this.props.user.username === this.props.owner;

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
    // Table config for compact mode
    const columns = [
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 160,
        render: (status, map) => (
          <span className="List-compact-status">
            <StatusLabel {...map} edit={this.edit} />
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
      { title: "Mapper", dataIndex: "creator", key: "creator" },
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
            <div className="List-compact-comment">
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
            <div className="List-compact-comment">
              <Tooltip title={c}>
                <MessageOutlined />
              </Tooltip>
            </div>
          ),
      },
    ];

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
        <div className="List-compact-toggle">
          <span className="List-compact-toggle-label">Table Mode:</span>
          <Switch checked={this.state.compact} onClick={this.toggleCompact} />
        </div>

        {this.state.modderType && (
          <h1 className="List-header">
            {this.props.owner}'s {this.titleText()}
          </h1>
        )}
        <div className="List-container">
          {this.state.compact ? (
            <Table
              className="List-table"
              columns={columns}
              dataSource={this.state.reqs}
              pagination={{ pageSize: 50 }}
            />
          ) : (
            this.state.reqs.map((req) => (
              <MapCard
                {...req}
                edit={this.edit}
                key={req._id}
                compact={this.props.archived}
                showModType={this.state.m4m && !this.props.archived}
              />
            ))
          )}
        </div>
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
            <Form.Item className="List-buttoncontainer">
              <Button type="primary" htmlType="submit" disabled={this.state.loading}>
                Submit
              </Button>
              <Button onClick={this.onRefresh} disabled={this.state.loading}>
                Refresh
              </Button>
              <Button onClick={this.onDelete} disabled={this.state.loading}>
                Delete
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    );
  }
}

export default List;
