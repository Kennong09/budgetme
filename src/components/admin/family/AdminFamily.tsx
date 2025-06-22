import React, { useState, useEffect, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  formatDate,
  formatPercentage,
} from "../../../utils/helpers";

// Import any necessary CSS
import "../admin.css";

interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
}

interface FamilyGroup {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  members_count: number;
  status: "active" | "inactive";
  owner?: User;
}

interface FamilyMember {
  id: string;
  user_id: string;
  family_id: string;
  role: "admin" | "viewer";
  join_date: string;
  user?: User;
}

const AdminFamily: React.FC = () => {
  // State for family groups data
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<FamilyMember[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showMembersModal, setShowMembersModal] = useState<boolean>(false);

  // State for summary data
  const [summary, setSummary] = useState({
    totalFamilies: 0,
    activeFamilies: 0,
    totalMembers: 0,
    avgMembersPerFamily: 0,
  });

  // Set up filter state
  const [filter, setFilter] = useState({
    name: "",
    status: "all",
    minMembers: "",
    maxMembers: "",
    sortBy: "created_at"
  });

  useEffect(() => {
    // Simulate API call to fetch all family groups
    const timer = setTimeout(() => {
      // This would normally be an API call to get all family groups
      const mockFamilyGroups = [
        {
          id: "1",
          name: "Johnson Family",
          owner_id: "1",
          created_at: "2023-01-15T10:30:00Z",
          members_count: 4,
          status: "active",
          owner: {
            id: "1",
            name: "John Johnson",
            email: "john@example.com",
            profilePicture: "/images/placeholder.png"
          }
        },
        {
          id: "2",
          name: "Smith Household",
          owner_id: "2",
          created_at: "2023-02-20T15:45:00Z",
          members_count: 3,
          status: "active",
          owner: {
            id: "2",
            name: "Jane Smith",
            email: "jane@example.com",
            profilePicture: "/images/placeholder.png"
          }
        },
        {
          id: "3",
          name: "Williams Family",
          owner_id: "3",
          created_at: "2023-03-10T09:15:00Z",
          members_count: 5,
          status: "active",
          owner: {
            id: "3",
            name: "Robert Williams",
            email: "robert@example.com",
            profilePicture: "/images/placeholder.png"
          }
        },
        {
          id: "4",
          name: "Brown Household",
          owner_id: "4",
          created_at: "2023-04-05T14:20:00Z",
          members_count: 2,
          status: "inactive",
          owner: {
            id: "4",
            name: "Sarah Brown",
            email: "sarah@example.com",
            profilePicture: "/images/placeholder.png"
          }
        },
        {
          id: "5",
          name: "Davis Family",
          owner_id: "5",
          created_at: "2023-05-12T11:10:00Z",
          members_count: 6,
          status: "active",
          owner: {
            id: "5",
            name: "Michael Davis",
            email: "michael@example.com",
            profilePicture: "/images/placeholder.png"
          }
        }
      ] as FamilyGroup[];

      setFamilyGroups(mockFamilyGroups);
      setFilteredGroups(mockFamilyGroups);
      
      // Calculate summary data
      calculateSummary(mockFamilyGroups);
      
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Function to calculate family groups summary
  const calculateSummary = (groups: FamilyGroup[]) => {
    const activeFamilies = groups.filter(group => group.status === 'active').length;
    const totalMembers = groups.reduce((sum, group) => sum + group.members_count, 0);
    
    setSummary({
      totalFamilies: groups.length,
      activeFamilies,
      totalMembers,
      avgMembersPerFamily: groups.length > 0 ? totalMembers / groups.length : 0,
    });
  };

  // Apply filters when filter state changes
  useEffect(() => {
    if (familyGroups.length === 0) return;
    
    // Show loading indicator
    setIsFiltering(true);
    
    setTimeout(() => {
      let result = [...familyGroups];
      
      // Filter by name
      if (filter.name) {
        const searchTerm = filter.name.toLowerCase();
        result = result.filter(group => 
          group.name.toLowerCase().includes(searchTerm) || 
          group.owner?.name.toLowerCase().includes(searchTerm)
        );
      }
      
      // Filter by status
      if (filter.status !== "all") {
        result = result.filter(group => group.status === filter.status);
      }
      
      // Filter by min members
      if (filter.minMembers) {
        result = result.filter(group => group.members_count >= parseInt(filter.minMembers));
      }
      
      // Filter by max members
      if (filter.maxMembers) {
        result = result.filter(group => group.members_count <= parseInt(filter.maxMembers));
      }
      
      // Sort results
      result = sortFamilyGroups(result, filter.sortBy);
      
      setFilteredGroups(result);
      calculateSummary(result);
      setIsFiltering(false);
    }, 300);
  }, [filter, familyGroups]);

  // Function to sort family groups
  const sortFamilyGroups = (groupsToSort: FamilyGroup[], sortBy: string): FamilyGroup[] => {
    switch(sortBy) {
      case "name":
        return [...groupsToSort].sort((a, b) => a.name.localeCompare(b.name));
      case "members":
        return [...groupsToSort].sort((a, b) => b.members_count - a.members_count);
      case "created_at":
      default:
        return [...groupsToSort].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  };

  // Handle filter changes
  const handleFilterChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    
    setIsFiltering(true);
    
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset filters to default
  const resetFilters = (): void => {
    setIsFiltering(true);
    
    setFilter({
      name: "",
      status: "all",
      minMembers: "",
      maxMembers: "",
      sortBy: "created_at"
    });
  };

  // Handle family group deletion
  const handleDeleteClick = (familyId: string): void => {
    setSelectedFamilyId(familyId);
    setShowDeleteModal(true);
  };

  const confirmDelete = (): void => {
    if (selectedFamilyId) {
      // In a real app, this would make an API call
      console.log(`Deleting family group with ID: ${selectedFamilyId}`);
      
      // Filter out the deleted family group
      const updatedGroups = familyGroups.filter(group => group.id !== selectedFamilyId);
      setFamilyGroups(updatedGroups);
      setFilteredGroups(filteredGroups.filter(group => group.id !== selectedFamilyId));
      calculateSummary(updatedGroups);
      
      // Close modal
      setShowDeleteModal(false);
      setSelectedFamilyId(null);
    }
  };

  // Handle viewing family members
  const handleViewMembers = (familyId: string): void => {
    setSelectedFamilyId(familyId);
    
    // Simulate API call to get family members
    // This would normally be an API call to get members of a specific family
    const mockFamilyMembers = [
      {
        id: "1",
        user_id: "1",
        family_id: familyId,
        role: "admin",
        join_date: "2023-01-15T10:30:00Z",
        user: {
          id: "1",
          name: "John Johnson",
          email: "john@example.com",
          profilePicture: "/images/placeholder.png"
        }
      },
      {
        id: "2",
        user_id: "6",
        family_id: familyId,
        role: "viewer",
        join_date: "2023-01-16T14:20:00Z",
        user: {
          id: "6",
          name: "Emily Johnson",
          email: "emily@example.com",
          profilePicture: "/images/placeholder.png"
        }
      },
      {
        id: "3",
        user_id: "7",
        family_id: familyId,
        role: "viewer",
        join_date: "2023-01-17T09:45:00Z",
        user: {
          id: "7",
          name: "James Johnson",
          email: "james@example.com",
          profilePicture: "/images/placeholder.png"
        }
      }
    ] as FamilyMember[];
    
    setSelectedFamilyMembers(mockFamilyMembers);
    setShowMembersModal(true);
  };

  // Get family group by ID
  const getSelectedFamily = (): FamilyGroup | undefined => {
    return familyGroups.find(group => group.id === selectedFamilyId);
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-600">Loading family group data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Family Group Management</h1>
        <div>
          <button className="btn btn-sm btn-primary shadow-sm mr-2">
            <i className="fas fa-download fa-sm text-white-50 mr-1"></i> Export Data
          </button>
          <Link to="/admin/family/create" className="btn btn-sm btn-success shadow-sm">
            <i className="fas fa-plus fa-sm text-white-50 mr-1"></i> Create Family Group
          </Link>
        </div>
      </div>

      {/* Summary Stats Cards Row */}
      <div className="row">
        {/* Total Family Groups Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Family Groups
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summary.totalFamilies}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-users fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Family Groups Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Active Family Groups
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summary.activeFamilies}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-user-check fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Members Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Total Members
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summary.totalMembers}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-user-friends fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Average Members Per Family Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Avg. Members Per Family
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summary.avgMembersPerFamily.toFixed(1)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-chart-line fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary">Filter Family Groups</h6>
          <button onClick={resetFilters} className="btn btn-sm btn-outline-primary">
            <i className="fas fa-redo-alt fa-sm mr-1"></i> Reset
          </button>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4 mb-3">
              <label htmlFor="name" className="font-weight-bold text-gray-800">Search</label>
              <input
                type="text"
                id="name"
                name="name"
                value={filter.name}
                onChange={handleFilterChange}
                placeholder="Search by family or owner name..."
                className="form-control"
              />
            </div>

            <div className="col-md-2 mb-3">
              <label htmlFor="status" className="font-weight-bold text-gray-800">Status</label>
              <select
                id="status"
                name="status"
                value={filter.status}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="col-md-2 mb-3">
              <label htmlFor="minMembers" className="font-weight-bold text-gray-800">Min Members</label>
              <input
                type="number"
                id="minMembers"
                name="minMembers"
                value={filter.minMembers}
                onChange={handleFilterChange}
                placeholder="Min"
                className="form-control"
                min="1"
              />
            </div>

            <div className="col-md-2 mb-3">
              <label htmlFor="maxMembers" className="font-weight-bold text-gray-800">Max Members</label>
              <input
                type="number"
                id="maxMembers"
                name="maxMembers"
                value={filter.maxMembers}
                onChange={handleFilterChange}
                placeholder="Max"
                className="form-control"
                min="1"
              />
            </div>

            <div className="col-md-2 mb-3">
              <label htmlFor="sortBy" className="font-weight-bold text-gray-800">Sort By</label>
              <select
                id="sortBy"
                name="sortBy"
                value={filter.sortBy}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="created_at">Date Created</option>
                <option value="name">Family Name</option>
                <option value="members">Member Count</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Family Groups Table */}
      <div className="card shadow mb-4">
        <div className="card-header py-3">
          <h6 className="m-0 font-weight-bold text-primary">All Family Groups</h6>
        </div>
        <div className="card-body">
          {isFiltering ? (
            <div className="text-center my-4">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Filtering...</span>
              </div>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center p-4">
              <div className="mb-3">
                <i className="fas fa-search fa-3x text-gray-300"></i>
              </div>
              <p className="text-gray-600 mb-0">No family groups found matching your criteria.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered" width="100%" cellSpacing="0">
                <thead>
                  <tr>
                    <th>Family Name</th>
                    <th>Owner</th>
                    <th>Members</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((group) => {
                    return (
                      <tr key={group.id}>
                        <td className="font-weight-bold">{group.name}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <img 
                              src={group.owner?.profilePicture || "/images/placeholder.png"} 
                              className="rounded-circle mr-2" 
                              width="30" 
                              height="30"
                              alt={group.owner?.name}
                            />
                            <div>
                              <div>{group.owner?.name}</div>
                              <div className="small text-gray-600">{group.owner?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-primary p-2">{group.members_count}</span>
                        </td>
                        <td>{formatDate(group.created_at)}</td>
                        <td>
                          <span className={`badge badge-${group.status === 'active' ? 'success' : 'danger'} p-2`}>
                            {group.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group">
                            <button 
                              onClick={() => handleViewMembers(group.id)} 
                              className="btn btn-sm btn-outline-primary mr-1" 
                              title="View Members"
                            >
                              <i className="fas fa-users"></i>
                            </button>
                            <Link to={`/admin/family/${group.id}/edit`} className="btn btn-sm btn-outline-warning mr-1" title="Edit">
                              <i className="fas fa-edit"></i>
                            </Link>
                            <button 
                              onClick={() => handleDeleteClick(group.id)} 
                              className="btn btn-sm btn-outline-danger" 
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>
              <span className="text-gray-600">Showing {filteredGroups.length} of {familyGroups.length} family groups</span>
            </div>
            <div>
              <button className="btn btn-sm btn-outline-primary">
                <i className="fas fa-download fa-sm mr-1"></i> Export Filtered Results
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button 
                  type="button" 
                  className="close" 
                  onClick={() => setShowDeleteModal(false)}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this family group? This action cannot be undone.</p>
                <p className="text-danger font-weight-bold">Note: This will remove all family connections and shared financial data.</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={confirmDelete}
                >
                  Delete Family Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Family Members Modal */}
      {showMembersModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {getSelectedFamily()?.name} - Members ({selectedFamilyMembers.length})
                </h5>
                <button 
                  type="button" 
                  className="close" 
                  onClick={() => setShowMembersModal(false)}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                {selectedFamilyMembers.length === 0 ? (
                  <div className="text-center p-4">
                    <div className="mb-3">
                      <i className="fas fa-users fa-3x text-gray-300"></i>
                    </div>
                    <p className="text-gray-600 mb-0">No members found for this family group.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered" width="100%" cellSpacing="0">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Role</th>
                          <th>Join Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFamilyMembers.map((member) => (
                          <tr key={member.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <img 
                                  src={member.user?.profilePicture || "/images/placeholder.png"} 
                                  className="rounded-circle mr-2" 
                                  width="30" 
                                  height="30"
                                  alt={member.user?.name}
                                />
                                <div>
                                  <div>{member.user?.name}</div>
                                  <div className="small text-gray-600">{member.user?.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`badge badge-${member.role === 'admin' ? 'primary' : 'secondary'} p-2`}>
                                {member.role === 'admin' ? 'Admin' : 'Viewer'}
                              </span>
                            </td>
                            <td>{formatDate(member.join_date)}</td>
                            <td>
                              <div className="btn-group">
                                <Link to={`/admin/users/${member.user_id}`} className="btn btn-sm btn-outline-info mr-1" title="View User">
                                  <i className="fas fa-user"></i>
                                </Link>
                                <button className="btn btn-sm btn-outline-danger" title="Remove from Family">
                                  <i className="fas fa-user-minus"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowMembersModal(false)}
                >
                  Close
                </button>
                <Link to={`/admin/family/${selectedFamilyId}/add-member`} className="btn btn-primary">
                  <i className="fas fa-user-plus mr-1"></i> Add Member
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFamily; 